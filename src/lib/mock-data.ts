export type Song = {
  id: string;
  title: string;
  artist: string;
  album: string;
  bpm: number;
  energy: number; // percentage
  mood: string;
  valence: number; // percentage
  firstPlayed: string;
  playCount: number;
  mostPlayed: string;
  coverGradient: [string, string]; // e.g. ['#78AFFF', '#7DE7E2']
};

export const MOCK_SONGS: Song[] = [
  {
    id: '1',
    title: 'Midnight City',
    artist: 'M83',
    album: 'Hurry Up, We’re Dreaming',
    bpm: 105,
    energy: 82,
    mood: 'Dream',
    valence: 68,
    firstPlayed: '2019.06.13',
    playCount: 231,
    mostPlayed: '00:00 - 02:00',
    coverGradient: ['#1A2980', '#26D0CE'],
  },
  {
    id: '2',
    title: 'Yellow',
    artist: 'Coldplay',
    album: 'Parachutes',
    bpm: 87,
    energy: 60,
    mood: 'Nostalgia',
    valence: 45,
    firstPlayed: '2019.06.13',
    playCount: 231,
    mostPlayed: '00:00 - 02:00',
    coverGradient: ['#F0B56A', '#EA8E83'],
  },
  {
    id: '3',
    title: 'Intro',
    artist: 'The xx',
    album: 'xx',
    bpm: 100,
    energy: 40,
    mood: 'Night',
    valence: 30,
    firstPlayed: '2018.01.20',
    playCount: 450,
    mostPlayed: '01:00 - 03:00',
    coverGradient: ['#0B1621', '#7DE7E2'],
  },
  {
    id: '4',
    title: 'Space Song',
    artist: 'Beach House',
    album: 'Depression Cherry',
    bpm: 147,
    energy: 65,
    mood: 'Dream',
    valence: 50,
    firstPlayed: '2020.11.05',
    playCount: 189,
    mostPlayed: '22:00 - 00:00',
    coverGradient: ['#B6A8D8', '#EA8E83'],
  },
  {
    id: '5',
    title: 'Nights',
    artist: 'Frank Ocean',
    album: 'Blonde',
    bpm: 90,
    energy: 55,
    mood: 'Vibe',
    valence: 40,
    firstPlayed: '2017.08.10',
    playCount: 342,
    mostPlayed: '18:00 - 20:00',
    coverGradient: ['#78AFFF', '#F0B56A'],
  }
];

export const MOCK_SPACES = [
  { id: 'home', title: 'HOME SPACE', description: 'Your music universe is waking up.' },
  { id: 'library', title: 'LIBRARY GALAXY', description: 'A small galaxy of familiar nights.' },
  { id: 'mood', title: 'MOOD SPACE', description: 'Choose a state, not a playlist.' },
  { id: 'memory', title: 'MEMORY FIELD', description: 'Some songs do not end. They stay somewhere in you.' },
  { id: 'visualizer', title: 'VISUALIZER WORLD', description: 'Let the sound build the world.' }
];

export type SpaceType = 'home' | 'library' | 'mood' | 'memory' | 'visualizer';
