"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockMusicProvider = void 0;
const MOCK_TRACKS = [
    {
        reference: { providerId: 'mock', platformTrackId: 'midnight-city-design-reference' },
        title: 'Midnight City',
        artist: { id: 'mock-m83', name: 'M83 (design reference)' },
        album: { id: 'mock-hurry-up', title: 'Hurry Up, We\'re Dreaming (reference)', artworkUrl: null },
        durationSeconds: 0,
        artworkUrl: null,
    },
];
class MockMusicProvider {
    id = 'mock';
    source = 'mock';
    capabilities = {
        search: true,
        trackDetails: true,
        playableSource: false,
        requiresAuthentication: false,
    };
    async search(query) {
        const text = query.text.trim().toLowerCase();
        const tracks = text
            ? MOCK_TRACKS.filter((track) => `${track.title} ${track.artist.name}`.toLowerCase().includes(text)).slice(0, query.limit)
            : [];
        return {
            providerId: this.id,
            query: query.text,
            tracks,
            nextCursor: null,
            source: this.source,
            error: null,
        };
    }
    async getTrack(reference) {
        const track = MOCK_TRACKS.find((candidate) => candidate.reference.platformTrackId === reference.platformTrackId);
        return track ? { ...track, playableSource: null } : null;
    }
    async getPlayableSource(_reference) {
        return null;
    }
}
exports.MockMusicProvider = MockMusicProvider;
