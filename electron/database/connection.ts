import Database from 'better-sqlite3';
import { runMigrations } from './migrations';

export function openDatabase(filePath: string) {
  const database = new Database(filePath);
  database.pragma('journal_mode = WAL');
  database.pragma('foreign_keys = ON');
  runMigrations(database);
  return database;
}
