import type { MusicProviderId } from '../music/providers';

export type PlaybackError = 'track_not_available' | 'track_not_loaded' | 'playback_not_ready';

export interface TrackWorldContext {
  scene: 'midnight';
  moodTags?: string[];
  energyTarget?: 'calm' | 'uplift' | 'electric';
  mapPreset?: string;
  worldLabel?: string;
}

export interface TrackIdentity {
  id: string;
  title: string;
  artist: string;
  album: string | null;
  source: string | null;
  durationSeconds: number;
  artworkUrl: string | null;
  providerId: MusicProviderId | 'local-file';
  providerTrackId: string | null;
  worldContext: TrackWorldContext | null;
}

export interface TrackRecord extends TrackIdentity {
  createdAt: string;
}

export interface TrackSessionState {
  trackId: string | null;
  isPlaying: boolean;
  positionSeconds: number;
  worldContext: TrackWorldContext | null;
  updatedAt: string;
}

export interface ListeningHistoryRecord {
  id: string;
  trackId: string;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number;
}

export interface ListeningMemoryRecord {
  id: string;
  trackId: string;
  note: string;
  createdAt: string;
}

export interface UserWorldSettingRecord {
  key: string;
  value: string;
  updatedAt: string;
}

export interface PlaybackStateRecord {
  trackId: string | null;
  positionSeconds: number;
  isPlaying: boolean;
  updatedAt: string;
}

