import { getDb, persistDb } from '@/db/client';
import type { QueryResultRow } from '@/lib/sql';

function rows<T>(result: QueryResultRow[]): T[] {
  return result as T[];
}

function row<T>(result: QueryResultRow[]): T | null {
  return (result[0] as T) ?? null;
}

export function queryAll<T>(sql: string, params: unknown[] = []): T[] {
  const db = getDb();
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const result: QueryResultRow[] = [];
  while (stmt.step()) result.push(stmt.getAsObject());
  stmt.free();
  return rows<T>(result);
}

export function queryOne<T>(sql: string, params: unknown[] = []): T | null {
  return row<T>(queryAll<T>(sql, params));
}

export function execute(sql: string, params: unknown[] = []): void {
  getDb().run(sql, params);
  persistDb();
}

export function executeMany(statements: { sql: string; params?: unknown[] }[]): void {
  const db = getDb();
  statements.forEach(({ sql, params = [] }) => db.run(sql, params));
  persistDb();
}

export function getNextNumber(prefix: string, table: string, column: string): string {
  const result = queryOne<{ max_num: number }>(
    `SELECT COALESCE(MAX(CAST(SUBSTR(${column}, ${prefix.length + 2}) AS INTEGER)), 0) as max_num FROM ${table} WHERE ${column} LIKE ?`,
    [`${prefix}-%`]
  );
  const next = (result?.max_num ?? 0) + 1;
  return `${prefix}-${String(next).padStart(5, '0')}`;
}
