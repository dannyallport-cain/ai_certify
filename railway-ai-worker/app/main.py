from __future__ import annotations

import os

from fastapi import FastAPI, Header, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware

from app.backup import (
    BackupError,
    create_database_backup,
    list_database_backups,
    restore_database_backup,
)
from app.pipeline import analyze_image
from app.schemas import (
    AnalyzeImageRequest,
    AnalyzeImageResponse,
    BackupDatabaseResponse,
    HealthResponse,
    ListBackupsResponse,
    RestoreDatabaseRequest,
    RestoreDatabaseResponse,
)

app = FastAPI(
    title="Railway AI Worker",
    version="0.1.0",
    description="Minimal FastAPI worker for image analysis scaffolding.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _require_backup_token(x_backup_token: str | None) -> None:
    expected_token = os.getenv("BACKUP_SHARED_SECRET")
    if not expected_token:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="BACKUP_SHARED_SECRET is not configured",
        )

    if x_backup_token != expected_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized",
        )


@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(status="ok", service="railway-ai-worker")


@app.post("/analyze-image", response_model=AnalyzeImageResponse)
async def analyze_image_endpoint(payload: AnalyzeImageRequest) -> AnalyzeImageResponse:
    return analyze_image(payload)


@app.post("/backup-database", response_model=BackupDatabaseResponse)
async def backup_database_endpoint(
    x_backup_token: str | None = Header(default=None, alias="X-Backup-Token"),
) -> BackupDatabaseResponse:
    _require_backup_token(x_backup_token)

    try:
        result = create_database_backup()
    except BackupError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        ) from exc

    return BackupDatabaseResponse(
        success=result.success,
        objectKey=result.object_key,
        bucket=result.bucket,
        dumpBytes=result.dump_bytes,
        gzipBytes=result.gzip_bytes,
        timestamp=result.timestamp,
    )


@app.get("/backups", response_model=ListBackupsResponse)
async def list_backups_endpoint(
    x_backup_token: str | None = Header(default=None, alias="X-Backup-Token"),
) -> ListBackupsResponse:
    _require_backup_token(x_backup_token)

    try:
        backups = list_database_backups()
    except BackupError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        ) from exc

    return ListBackupsResponse(
        success=True,
        backups=[
            {
                "objectKey": backup.object_key,
                "bucket": backup.bucket,
                "size": backup.size,
                "timestamp": backup.timestamp,
                "lastModified": backup.last_modified,
            }
            for backup in backups
        ],
    )


@app.post("/restore-database", response_model=RestoreDatabaseResponse)
async def restore_database_endpoint(
    payload: RestoreDatabaseRequest,
    x_backup_token: str | None = Header(default=None, alias="X-Backup-Token"),
) -> RestoreDatabaseResponse:
    _require_backup_token(x_backup_token)

    try:
        result = restore_database_backup(payload.objectKey)
    except BackupError as exc:
        detail = str(exc)
        status_code = (
            status.HTTP_400_BAD_REQUEST
            if "objectKey" in detail or "Invalid objectKey" in detail
            else status.HTTP_500_INTERNAL_SERVER_ERROR
        )
        raise HTTPException(
            status_code=status_code,
            detail=detail,
        ) from exc

    return RestoreDatabaseResponse(
        success=result.success,
        objectKey=result.object_key,
        bucket=result.bucket,
        restoredAt=result.restored_at,
    )