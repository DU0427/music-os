import type Database from 'better-sqlite3';
import type {
  ListeningHistoryRecord,
  ListeningMemoryRecord,
  PlaybackStateRecord,
  TrackRecord,
  TrackWorldContext,
  UserWorldSettingRecord,
} from '../../../src/shared/ipc/music';
import { databaseOperation } from '../errors';

type TrackRow = {
  id: string;
  title: string;
  artist: string;
  album: string | null;
  source: string | null;
  duration_seconds: number;
  created_at: string;
  artwork_url: string | null;
  provider_id: string | null;
  provider_track_id: string | null;
  world_context: string | null;
};

function asTrackProviderId(value: string | null): TrackRecord['providerId'] {
  if (value === 'mock' || value === 'netease' || value === 'qq' || value === 'local-file') {
    return value;
  }
  return 'local-file';
}

function parseWorldContext(worldContext: string | null): TrackWorldContext | null {
  if (!worldContext) {
    return null;
  }
  try {
    return JSON.parse(worldContext) as TrackWorldContext;
  } catch {
    return null;
  }
}

function serializeWorldContext(worldContext: TrackWorldContext | null): string | null {
  if (!worldContext) {
    return null;
  }
  return JSON.stringify(worldContext);
}

function mapTrackRow(row: TrackRow): TrackRecord {
  return {
    id: row.id,
    title: row.title,
    artist: row.artist,
    album: row.album,
    source: row.source,
    durationSeconds: row.duration_seconds,
    createdAt: row.created_at,
    artworkUrl: row.artwork_url,
    providerId: asTrackProviderId(row.provider_id),
    providerTrackId: row.provider_track_id,
    worldContext: parseWorldContext(row.world_context),
  };
}

export class MusicRepository {
  constructor(private readonly database: Database.Database) {}

  listTracks() {
    return databaseOperation(() =>
      (this.database
        .prepare(
          `SELECT id, title, artist, album, source, duration_seconds AS duration_seconds, created_at AS created_at,
                  artwork_url, provider_id, provider_track_id, world_context
           FROM tracks ORDER BY created_at DESC`,
        )
        .all() as TrackRow[])
        .map(mapTrackRow),
    );
  }

  upsertTrack(track: TrackRecord) {
    return databaseOperation(() => {
      this.database
        .prepare(
          `INSERT INTO tracks (
             id,
             title,
             artist,
             album,
             source,
             duration_seconds,
             created_at,
             artwork_url,
             provider_id,
             provider_track_id,
             world_context
           )
           VALUES (
             @id,
             @title,
             @artist,
             @album,
             @source,
             @durationSeconds,
             @createdAt,
             @artworkUrl,
             @providerId,
             @providerTrackId,
             @worldContext
           )
           ON CONFLICT(id) DO UPDATE SET
             title = excluded.title,
             artist = excluded.artist,
             album = excluded.album,
             source = excluded.source,
             duration_seconds = excluded.duration_seconds,
             artwork_url = excluded.artwork_url,
             provider_id = excluded.provider_id,
             provider_track_id = excluded.provider_track_id,
             world_context = excluded.world_context`,
        )
        .run({
          ...track,
          artworkUrl: track.artworkUrl,
          providerId: track.providerId,
          providerTrackId: track.providerTrackId,
          worldContext: serializeWorldContext(track.worldContext),
        });
      return track;
    });
  }

  listListeningHistory() {
    return databaseOperation(() =>
      this.database
        .prepare(
          `SELECT id, track_id AS trackId, started_at AS startedAt, ended_at AS endedAt,
                  duration_seconds AS durationSeconds
           FROM listening_history ORDER BY started_at DESC`,
        )
        .all() as ListeningHistoryRecord[],
    );
  }

  addListeningHistory(record: ListeningHistoryRecord) {
    return databaseOperation(() => {
      this.database
        .prepare(
          `INSERT INTO listening_history (id, track_id, started_at, ended_at, duration_seconds)
           VALUES (@id, @trackId, @startedAt, @endedAt, @durationSeconds)`,
        )
        .run(record);
      return record;
    });
  }

  updateListeningHistory(record: ListeningHistoryRecord) {
    return databaseOperation(() => {
      this.database
        .prepare(
          `UPDATE listening_history
             SET track_id = @trackId,
                 started_at = @startedAt,
                 ended_at = @endedAt,
                 duration_seconds = @durationSeconds
           WHERE id = @id`,
        )
        .run(record);
      return record;
    });
  }

  listListeningMemories() {
    return databaseOperation(() =>
      this.database
        .prepare(
          `SELECT id, track_id AS trackId, note, created_at AS createdAt
           FROM listening_memories ORDER BY created_at DESC`,
        )
        .all() as ListeningMemoryRecord[],
    );
  }

  addListeningMemory(record: ListeningMemoryRecord) {
    return databaseOperation(() => {
      this.database
        .prepare(
          `INSERT INTO listening_memories (id, track_id, note, created_at)
           VALUES (@id, @trackId, @note, @createdAt)`,
        )
        .run(record);
      return record;
    });
  }

  getWorldSetting(key: string) {
    return databaseOperation(() =>
      (this.database
        .prepare(
          `SELECT key, value, updated_at AS updatedAt
           FROM user_world_settings WHERE key = ?`,
        )
        .get(key) as (Omit<UserWorldSettingRecord, 'updatedAt'> & { updatedAt: string }) | undefined) ?? null,
    );
  }

  setWorldSetting(record: UserWorldSettingRecord) {
    return databaseOperation(() => {
      this.database
        .prepare(
          `INSERT INTO user_world_settings (key, value, updated_at)
           VALUES (@key, @value, @updatedAt)
           ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
        )
        .run(record);
      return record;
    });
  }

  getPlaybackState() {
    return databaseOperation(() => {
      const row = this.database
        .prepare(
          `SELECT track_id AS trackId, position_seconds AS positionSeconds,
                  is_playing = 1 AS isPlaying, updated_at AS updatedAt
           FROM playback_state WHERE id = 1`,
        )
        .get() as (Omit<PlaybackStateRecord, 'isPlaying'> & { isPlaying: number }) | undefined;
      return row ? { ...row, isPlaying: Boolean(row.isPlaying) } : null;
    });
  }

  savePlaybackState(state: PlaybackStateRecord) {
    return databaseOperation(() => {
      this.database
        .prepare(
          `INSERT INTO playback_state (id, track_id, position_seconds, is_playing, updated_at)
           VALUES (1, @trackId, @positionSeconds, @isPlaying, @updatedAt)
           ON CONFLICT(id) DO UPDATE SET
             track_id = excluded.track_id,
             position_seconds = excluded.position_seconds,
             is_playing = excluded.is_playing,
             updated_at = excluded.updated_at`,
        )
        .run({ ...state, isPlaying: state.isPlaying ? 1 : 0 });
      return state;
    });
  }

  close() {
    this.database.close();
  }
}
