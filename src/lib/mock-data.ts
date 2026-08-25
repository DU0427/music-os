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
    title: '午夜之城',
    artist: 'M83',
    album: '快醒来，我们在做梦',
    bpm: 105,
    energy: 82,
    mood: '梦境',
    valence: 68,
    firstPlayed: '2019.06.13',
    playCount: 231,
    mostPlayed: '00:00 - 02:00',
    coverGradient: ['#1A2980', '#26D0CE'],
  },
  {
    id: '2',
    title: '黄昏',
    artist: 'Coldplay',
    album: '降落伞',
    bpm: 87,
    energy: 60,
    mood: '怀旧',
    valence: 45,
    firstPlayed: '2019.06.13',
    playCount: 231,
    mostPlayed: '00:00 - 02:00',
    coverGradient: ['#F0B56A', '#EA8E83'],
  },
  {
    id: '3',
    title: '序曲',
    artist: 'The xx',
    album: 'xx',
    bpm: 100,
    energy: 40,
    mood: '夜晚',
    valence: 30,
    firstPlayed: '2018.01.20',
    playCount: 450,
    mostPlayed: '01:00 - 03:00',
    coverGradient: ['#0B1621', '#7DE7E2'],
  },
  {
    id: '4',
    title: '星空之歌',
    artist: 'Beach House',
    album: '忧郁樱桃',
    bpm: 147,
    energy: 65,
    mood: '梦境',
    valence: 50,
    firstPlayed: '2020.11.05',
    playCount: 189,
    mostPlayed: '22:00 - 00:00',
    coverGradient: ['#B6A8D8', '#EA8E83'],
  },
  {
    id: '5',
    title: '夜色',
    artist: 'Frank Ocean',
    album: '金发',
    bpm: 90,
    energy: 55,
    mood: '氛围',
    valence: 40,
    firstPlayed: '2017.08.10',
    playCount: 342,
    mostPlayed: '18:00 - 20:00',
    coverGradient: ['#78AFFF', '#F0B56A'],
  }
];

export const MOCK_SPACES = [
  {
    id: 'home',
    title: '主空间',
    description: '你的空间地图将在这里重塑。',
  },
  {
    id: 'library',
    title: '图书馆',
    description: '浏览按风格整理的收藏与音景。',
  },
  {
    id: 'mood',
    title: '情绪空间',
    description: '在这里选择情绪轨迹，让世界随之变换。',
  },
  {
    id: 'memory',
    title: '记忆空间',
    description: '从第一站的闪回开始，追踪你最近走过的节奏。',
  },
  {
    id: 'visualizer',
    title: '可视化世界',
    description: '把声音转化成可探索的天体景观。',
  },
];

export type SpaceType = 'home' | 'library' | 'mood' | 'memory' | 'visualizer';
