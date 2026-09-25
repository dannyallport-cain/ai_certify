/**
 * Helpers for inspecting failures raised by Drizzle ORM.
 *
 * Drizzle wraps driver-level failures in a `DrizzleQueryError` whose `message`
 * contains the generated SQL. The PostgreSQL error code therefore lives on
 * `error.cause` (and may be nested further when transactions are involved)
 * rather than on the error that callers actually catch.
 *
 * Checking `error.code` directly — as some call sites used to do — never
 * matches, which turns a recoverable "table is missing" into an unhandled
 * server error.
 */

/** PostgreSQL error code: `relation "x" does not exist`. */
export const UNDEFINED_TABLE_CODE = '42P01';

/** PostgreSQL error code: `column "x" does not exist`. */
export const UNDEFINED_COLUMN_CODE = '42703';

/** PostgreSQL error code: `invalid input value for enum`. */
export const INVALID_ENUM_VALUE_CODE = '22P02';

type ErrorLike = {
  code?: unknown;
  cause?: unknown;
};

function isObject(value: unknown): value is ErrorLike {
  return typeof value === 'object' && value !== null;
}

function readString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

/**
 * Walk the `cause` chain of an error and return the first PostgreSQL error
 * code found, or `null` when the failure did not originate from PostgreSQL.
 */
export function getPostgresErrorCode(error: unknown): string | null {
  let current: unknown = error;
  const visited = new Set<unknown>();

  while (isObject(current) && !visited.has(current)) {
    visited.add(current);

    const code = readString(current.code);
    if (code) {
      return code;
    }

    const driverCode = isObject(current.cause) ? readString(current.cause.code) : null;
    if (driverCode) {
      return driverCode;
    }

    current = current.cause;
  }

  return null;
}

/**
 * True when the failure is caused by the database schema being behind the
 * application code — a missing table or a missing column.
 *
 * Callers can treat this as schema drift and degrade gracefully rather than
 * taking down the whole page or request.
 */
export function isSchemaDriftError(error: unknown): boolean {
  const code = getPostgresErrorCode(error);
  return code === UNDEFINED_TABLE_CODE || code === UNDEFINED_COLUMN_CODE;
}
