from __future__ import annotations

import os

from fastapi import FastAPI, Header, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware

from app.llm_provider import probe_local_llm_provider
from app.schemas import (
    AnalyzeImageRequest,
    AnalyzeImageResponse,
    BackupDatabaseResponse,
    DeleteBackupRequest,
    DeleteBackupResponse,
    HealthResponse,
    ListBackupsResponse,
    LocalLLMInfo,
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


def _load_pipeline_module():
    from app.pipeline import analyze_image

    return {"analyze_image": analyze_image}


def _load_backup_module():
    from app.backup import (
        BackupError,
        create_database_backup,
        delete_database_backup,
        list_database_backups,
        restore_database_backup,
    )

    return {
        "BackupError": BackupError,
        "create_database_backup": create_database_backup,
        "delete_database_backup": delete_database_backup,
        "list_database_backups": list_database_backups,
        "restore_database_backup": restore_database_backup,
    }


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
async def health(probe_provider: bool = Query(default=False, alias="probeProvider")) -> HealthResponse:
    if probe_provider:
        probe = await probe_local_llm_provider()
        local_llm = LocalLLMInfo(
            provider=probe.provider,
            enabled=probe.enabled,
            baseUrl=probe.base_url,
            model=probe.model,
            apiStyle=probe.api_style,
            source=probe.source,
            status=probe.status,
            reachable=probe.reachable,
            healthy=probe.healthy,
            selectedModelAvailable=probe.selected_model_available,
            availableModels=probe.available_models or [],
            detail=probe.detail,
        )
    else:
        from app.pipeline import _build_local_llm_info

        local_llm = _build_local_llm_info()

    return HealthResponse(status="ok", service="railway-ai-worker", localLlm=local_llm)


@app.post("/analyze-image", response_model=AnalyzeImageResponse)
async def analyze_image_endpoint(payload: AnalyzeImageRequest) -> AnalyzeImageResponse:
    pipeline_module = _load_pipeline_module()
    return pipeline_module["analyze_image"](payload)


@app.post("/backup-database", response_model=BackupDatabaseResponse)
async def backup_database_endpoint(
    x_backup_token: str | None = Header(default=None, alias="X-Backup-Token"),
) -> BackupDatabaseResponse:
    _require_backup_token(x_backup_token)
    backup_module = _load_backup_module()

    try:
        result = backup_module["create_database_backup"]()
    except backup_module["BackupError"] as exc:
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
    backup_module = _load_backup_module()

    try:
        backups = backup_module["list_database_backups"]()
    except backup_module["BackupError"] as exc:
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
    backup_module = _load_backup_module()

    try:
        result = backup_module["restore_database_backup"](payload.objectKey)
    except backup_module["BackupError"] as exc:
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


@app.delete("/backups", response_model=DeleteBackupResponse)
async def delete_backup_endpoint(
    payload: DeleteBackupRequest,
    x_backup_token: str | None = Header(default=None, alias="X-Backup-Token"),
) -> DeleteBackupResponse:
    _require_backup_token(x_backup_token)
    backup_module = _load_backup_module()

    try:
        result = backup_module["delete_database_backup"](payload.objectKey)
    except backup_module["BackupError"] as exc:
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

    return DeleteBackupResponse(
        success=result.success,
        objectKey=result.object_key,
        bucket=result.bucket,
        deletedAt=result.deleted_at,
    )