import { drizzle, type ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';
import * as schema from './schema';

let _db: ExpoSQLiteDatabase<typeof schema> | null = null;

function getDatabase(): ExpoSQLiteDatabase<typeof schema> {
  if (!_db) {
    const expoDb = openDatabaseSync('inflammation.db', { enableChangeListener: true });
    expoDb.execSync(`
      CREATE TABLE IF NOT EXISTS entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL UNIQUE,
        sleep INTEGER NOT NULL,
        stress INTEGER NOT NULL,
        diet INTEGER NOT NULL,
        exercise INTEGER NOT NULL,
        score INTEGER NOT NULL,
        created_at INTEGER NOT NULL DEFAULT (unixepoch())
      );
    `);
    expoDb.execSync(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      );
    `);
    _db = drizzle(expoDb, { schema });
  }
  return _db;
}

export const db = new Proxy({} as ExpoSQLiteDatabase<typeof schema>, {
  get(_, prop) {
    return (getDatabase() as any)[prop];
  },
});

function getRawDb() {
  getDatabase(); // ensure init
  return openDatabaseSync('inflammation.db');
}

export function getSetting(key: string): string | null {
  const row = getRawDb().getFirstSync<{ value: string }>(
    'SELECT value FROM settings WHERE key = ?',
    [key],
  );
  return row?.value ?? null;
}

export function setSetting(key: string, value: string): void {
  getRawDb().runSync(
    'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
    [key, value],
  );
}

export function deleteSetting(key: string): void {
  getRawDb().runSync('DELETE FROM settings WHERE key = ?', [key]);
}

export function clearAllData(): void {
  const raw = getRawDb();
  raw.runSync('DELETE FROM entries');
  raw.runSync('DELETE FROM settings');
}

export function seedTestData(days: number = 14): void {
  const raw = getRawDb();
  for (let i = days; i >= 1; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const sleep = Math.floor(Math.random() * 4) + 6;     // 6-9
    const stress = Math.floor(Math.random() * 5) + 5;    // 5-9
    const diet = Math.floor(Math.random() * 4) + 5;      // 5-8
    const exercise = Math.floor(Math.random() * 5) + 4;  // 4-8
    const score = Math.round(
      sleep * 2.5 + (stress * 2.5) + diet * 2.5 + exercise * 2.5
    );
    const clampedScore = Math.min(100, Math.max(0, score));
    raw.runSync(
      `INSERT OR IGNORE INTO entries (date, sleep, stress, diet, exercise, score, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [dateStr, sleep, stress, diet, exercise, clampedScore, Math.floor(d.getTime() / 1000)],
    );
  }
}
