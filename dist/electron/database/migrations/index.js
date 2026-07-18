"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runMigrations = runMigrations;
function addOptionalColumn(database, table, columnSql) {
    const [columnName] = columnSql.split(' ');
    const existing = database
        .prepare(`PRAGMA table_info(${table})`)
        .all().map((entry) => entry.name);
    if (!existing.includes(columnName)) {
        database.exec(`ALTER TABLE ${table} ADD COLUMN ${columnSql}`);
    }
}
const migrations = [
    {
        id: 1,
        apply: (database) => {
            database.exec(`
        CREATE TABLE IF NOT EXISTS tracks (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          artist TEXT NOT NULL,
          album TEXT,
          source TEXT,
          duration_seconds REAL NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS listening_history (
          id TEXT PRIMARY KEY,
          track_id TEXT NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
          started_at TEXT NOT NULL,
          ended_at TEXT,
          duration_seconds REAL NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS listening_memories (
          id TEXT PRIMARY KEY,
          track_id TEXT NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
          note TEXT NOT NULL,
          created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS user_world_settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS playback_state (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          track_id TEXT REFERENCES tracks(id) ON DELETE SET NULL,
          position_seconds REAL NOT NULL DEFAULT 0,
          is_playing INTEGER NOT NULL DEFAULT 0,
          updated_at TEXT NOT NULL
        );
      `);
        },
    },
    {
        id: 2,
        apply: (database) => {
            addOptionalColumn(database, 'tracks', 'artwork_url TEXT');
            addOptionalColumn(database, 'tracks', 'provider_id TEXT');
            addOptionalColumn(database, 'tracks', 'provider_track_id TEXT');
            addOptionalColumn(database, 'tracks', 'world_context TEXT');
        },
    },
];
function runMigrations(database) {
    database.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);
    const hasMigration = database.prepare('SELECT id FROM schema_migrations WHERE id = ?');
    const recordMigration = database.prepare('INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)');
    for (const migration of migrations) {
        if (hasMigration.get(migration.id)) {
            continue;
        }
        database.transaction(() => {
            migration.apply(database);
            recordMigration.run(migration.id, new Date().toISOString());
        })();
    }
}
