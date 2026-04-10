from __future__ import annotations

import gzip
import os
import shutil
import subprocess
import tempfile
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import boto3
import psycopg


class BackupError(Exception):
    pass


@dataclass
class BackupResult:
    success: bool
    object_key: str
    timestamp: str
    dump_bytes: int
    gzip_bytes: int
    bucket: str


@dataclass
class BackupListItem:
    object_key: str
    bucket: str
    size: int | None
    timestamp: str | None
    last_modified: str | None


@dataclass
class RestoreResult:
    success: bool
    object_key: str
    bucket: str
    restored_at: str


BACKUP_PREFIX = "database-backups/"


def _get_required_env(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise BackupError(f"Missing required environment variable: {name}")
    return value


def _get_database_url() -> str:
    return os.getenv("POSTGRES_URL") or os.getenv("DATABASE_URL") or ""


def _build_object_key(now: datetime) -> str:
    return (
        f"{BACKUP_PREFIX}{now.strftime('%Y')}/{now.strftime('%m')}/"
        f"ai-certify-db-{now.strftime('%Y%m%d-%H%M%S')}.sql.gz"
    )


def _get_r2_client() -> Any:
    account_id = _get_required_env("R2_ACCOUNT_ID")
    access_key_id = _get_required_env("R2_ACCESS_KEY_ID")
    secret_access_key = _get_required_env("R2_SECRET_ACCESS_KEY")

    return boto3.client(
        "s3",
        endpoint_url=f"https://{account_id}.r2.cloudflarestorage.com",
        aws_access_key_id=access_key_id,
        aws_secret_access_key=secret_access_key,
        region_name="auto",
    )


def _validate_backup_object_key(object_key: str) -> str:
    normalized_key = object_key.strip()
    if not normalized_key:
        raise BackupError("objectKey is required")
    if not normalized_key.startswith(BACKUP_PREFIX):
        raise BackupError("objectKey must be within the database-backups/ prefix")
    if normalized_key.startswith("/") or ".." in normalized_key.split("/"):
        raise BackupError("Invalid objectKey")
    return normalized_key


def _extract_timestamp_from_key(object_key: str) -> str | None:
    filename = Path(object_key).name
    prefix = "ai-certify-db-"
    suffix = ".sql.gz"
    if not filename.startswith(prefix) or not filename.endswith(suffix):
        return None

    raw_timestamp = filename[len(prefix) : -len(suffix)]
    try:
        parsed = datetime.strptime(raw_timestamp, "%Y%m%d-%H%M%S").replace(tzinfo=UTC)
    except ValueError:
        return None
    return parsed.isoformat()


def _sql_literal(value: Any) -> str:
    if value is None:
        return "NULL"
    if isinstance(value, bool):
        return "TRUE" if value else "FALSE"
    if isinstance(value, (int, float)):
        return str(value)
    if isinstance(value, memoryview):
        value = bytes(value)
    if isinstance(value, bytes):
        return "'\\x" + value.hex() + "'::bytea"
    return "'" + str(value).replace("\\", "\\\\").replace("'", "''") + "'"


def _copy_table_data(conn: psycopg.Connection[Any], table_name: str, output_file: Any) -> None:
    with conn.cursor() as cur:
        copy_sql = f"COPY {table_name} TO STDOUT WITH (FORMAT CSV, HEADER FALSE)"
        with cur.copy(copy_sql) as copy:
            while True:
                chunk = copy.read()
                if not chunk:
                    break
                if isinstance(chunk, str):
                    output_file.write(chunk.encode("utf-8"))
                else:
                    output_file.write(chunk)


def _write_schema_only_dump(database_url: str, output_path: Path) -> None:
    with psycopg.connect(database_url) as conn, output_path.open("wb") as output_file:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT table_schema, table_name
                FROM information_schema.tables
                WHERE table_type = 'BASE TABLE'
                  AND table_schema NOT IN ('pg_catalog', 'information_schema')
                ORDER BY table_schema, table_name
                """
            )
            tables = cur.fetchall()

        output_file.write(b"-- ai_certify fallback backup\n")
        output_file.write(
            b"-- generated without pg_dump; includes table data but not full schema DDL\n"
        )
        output_file.write(f"-- generated at {datetime.now(UTC).isoformat()}\n\n".encode("utf-8"))

        for schema_name, table_name in tables:
            qualified_table = f'"{schema_name}"."{table_name}"'
            output_file.write(f"-- Data for {qualified_table}\n".encode("utf-8"))
            output_file.write(
                f"TRUNCATE TABLE {qualified_table} RESTART IDENTITY CASCADE;\n".encode("utf-8")
            )
            output_file.write(
                f"COPY {qualified_table} FROM stdin WITH (FORMAT csv);\n".encode("utf-8")
            )
            _copy_table_data(conn, qualified_table, output_file)
            output_file.write(b"\\.\n\n")


def _run_pg_dump(database_url: str, output_path: Path) -> None:
    pg_dump_path = shutil.which("pg_dump")
    if not pg_dump_path:
        candidate_paths = [
            "/nix/var/nix/profiles/default/bin/pg_dump",
            "/usr/bin/pg_dump",
            "/usr/local/bin/pg_dump",
        ]
        pg_dump_path = next((path for path in candidate_paths if Path(path).exists()), None)

    if not pg_dump_path:
        _write_schema_only_dump(database_url, output_path)
        return

    try:
        with output_path.open("wb") as output_file:
            subprocess.run(
                [pg_dump_path, "--no-owner", "--no-privileges", database_url],
                stdout=output_file,
                stderr=subprocess.PIPE,
                check=True,
                text=False,
            )
    except subprocess.CalledProcessError as exc:
        stderr = exc.stderr.decode("utf-8", errors="ignore").strip() if exc.stderr else ""
        if "server version" in stderr.lower() and "pg_dump version" in stderr.lower():
            _write_schema_only_dump(database_url, output_path)
            return
        message = stderr or "pg_dump failed"
        raise BackupError(message) from exc


def _gzip_file(source_path: Path, target_path: Path) -> int:
    with source_path.open("rb") as source_file, gzip.open(target_path, "wb") as gzip_file:
        shutil.copyfileobj(source_file, gzip_file)
    return target_path.stat().st_size


def _gunzip_file(source_path: Path, target_path: Path) -> int:
    with gzip.open(source_path, "rb") as gzip_file, target_path.open("wb") as output_file:
        shutil.copyfileobj(gzip_file, output_file)
    return target_path.stat().st_size


def _upload_to_r2(file_path: Path, object_key: str, bucket: str) -> None:
    client = _get_r2_client()
    client.upload_file(
        str(file_path),
        bucket,
        object_key,
        ExtraArgs={
            "ContentType": "application/gzip",
            "ContentEncoding": "gzip",
        },
    )


def _download_from_r2(file_path: Path, object_key: str, bucket: str) -> None:
    client = _get_r2_client()
    client.download_file(bucket, object_key, str(file_path))


def _find_psql_path() -> str | None:
    psql_path = shutil.which("psql")
    if psql_path:
        return psql_path

    candidate_paths = [
        "/nix/var/nix/profiles/default/bin/psql",
        "/usr/bin/psql",
        "/usr/local/bin/psql",
    ]
    return next((path for path in candidate_paths if Path(path).exists()), None)


def _restore_with_psql(database_url: str, sql_path: Path) -> None:
    psql_path = _find_psql_path()
    if not psql_path:
        raise BackupError("psql is not available")

    try:
        subprocess.run(
            [psql_path, database_url, "-v", "ON_ERROR_STOP=1", "-f", str(sql_path)],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=True,
            text=False,
        )
    except subprocess.CalledProcessError as exc:
        stderr = exc.stderr.decode("utf-8", errors="ignore").strip() if exc.stderr else ""
        raise BackupError(stderr or "psql restore failed") from exc


def _restore_with_psycopg(database_url: str, sql_path: Path) -> None:
    sql_text = sql_path.read_text(encoding="utf-8")
    with psycopg.connect(database_url, autocommit=True) as conn:
        with conn.cursor() as cur:
            cur.execute(sql_text)


def list_database_backups() -> list[BackupListItem]:
    bucket = _get_required_env("R2_BUCKET")
    client = _get_r2_client()

    backups: list[BackupListItem] = []
    continuation_token: str | None = None

    while True:
        params: dict[str, Any] = {
            "Bucket": bucket,
            "Prefix": BACKUP_PREFIX,
            "MaxKeys": 1000,
        }
        if continuation_token:
            params["ContinuationToken"] = continuation_token

        response = client.list_objects_v2(**params)
        for item in response.get("Contents", []):
            object_key = item.get("Key")
            if not object_key or not object_key.startswith(BACKUP_PREFIX):
                continue

            last_modified = item.get("LastModified")
            last_modified_iso = (
                last_modified.astimezone(UTC).isoformat() if last_modified is not None else None
            )
            backups.append(
                BackupListItem(
                    object_key=object_key,
                    bucket=bucket,
                    size=item.get("Size"),
                    timestamp=_extract_timestamp_from_key(object_key) or last_modified_iso,
                    last_modified=last_modified_iso,
                )
            )

        if not response.get("IsTruncated"):
            break
        continuation_token = response.get("NextContinuationToken")

    backups.sort(key=lambda backup: backup.timestamp or backup.last_modified or "", reverse=True)
    return backups


def create_database_backup() -> BackupResult:
    database_url = _get_database_url()
    if not database_url:
        raise BackupError("Missing required environment variable: POSTGRES_URL or DATABASE_URL")

    bucket = _get_required_env("R2_BUCKET")
    now = datetime.now(UTC)
    timestamp = now.isoformat()
    object_key = _build_object_key(now)

    with tempfile.TemporaryDirectory(prefix="db-backup-") as temp_dir:
        temp_path = Path(temp_dir)
        dump_path = temp_path / "database.sql"
        gzip_path = temp_path / "database.sql.gz"

        _run_pg_dump(database_url, dump_path)
        dump_bytes = dump_path.stat().st_size
        gzip_bytes = _gzip_file(dump_path, gzip_path)
        _upload_to_r2(gzip_path, object_key, bucket)

    return BackupResult(
        success=True,
        object_key=object_key,
        timestamp=timestamp,
        dump_bytes=dump_bytes,
        gzip_bytes=gzip_bytes,
        bucket=bucket,
    )


def restore_database_backup(object_key: str) -> RestoreResult:
    database_url = _get_database_url()
    if not database_url:
        raise BackupError("Missing required environment variable: POSTGRES_URL or DATABASE_URL")

    bucket = _get_required_env("R2_BUCKET")
    validated_object_key = _validate_backup_object_key(object_key)

    with tempfile.TemporaryDirectory(prefix="db-restore-") as temp_dir:
        temp_path = Path(temp_dir)
        gzip_path = temp_path / "database.sql.gz"
        sql_path = temp_path / "database.sql"

        _download_from_r2(gzip_path, validated_object_key, bucket)
        _gunzip_file(gzip_path, sql_path)

        try:
            _restore_with_psql(database_url, sql_path)
        except BackupError as exc:
            if "psql is not available" not in str(exc):
                raise
            _restore_with_psycopg(database_url, sql_path)

    return RestoreResult(
        success=True,
        object_key=validated_object_key,
        bucket=bucket,
        restored_at=datetime.now(UTC).isoformat(),
    )
