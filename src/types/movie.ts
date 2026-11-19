export interface TaxonomyRef {
  id: string;
  name: string;
  slug: string;
}

export type GenreItem = TaxonomyRef;
export type CountryItem = TaxonomyRef;

export interface MovieRating {
  voteAverage: number;
  voteCount: number;
}

export interface MovieSummary {
  id: string;
  name: string;
  originName: string;
  slug: string;
  type: 'single' | 'series' | 'hoathinh' | 'tvshows' | string;
  posterUrl: string;
  thumbUrl: string;
  year: number;
  quality: string;
  lang: string;
  time: string;
  episodeCurrent: string;
  categories: TaxonomyRef[];
  countries: TaxonomyRef[];
  rating: MovieRating;
  modifiedAt: string;
}

export interface EpisodeItem {
  name: string;
  slug: string;
  filename: string;
  linkEmbed: string;
  linkM3u8: string;
}

export interface EpisodeServer {
  serverName: string;
  episodes: EpisodeItem[];
}

export interface MovieDetail extends MovieSummary {
  content: string;
  status: string;
  episodeTotal: number;
  actors: string[];
  directors: string[];
  trailerUrl: string | null;
  servers: EpisodeServer[];
}

export interface WatchHistoryEntry {
  slug: string;
  name: string;
  originName: string;
  posterUrl: string;
  thumbUrl: string;
  year: number;
  quality: string;
  episodeSlug: string;
  episodeName: string;
  serverName: string;
  watchedEpisodes: string[];
  nextEpisodeSlug?: string;
  nextEpisodeName?: string;
  episodeTotal?: number;
  progressSeconds: number;
  durationSeconds: number;
  categories: TaxonomyRef[];
  countries: TaxonomyRef[];
  watchedAt: number; // epoch ms
}

export interface SavedMovieSnapshot {
  slug: string;
  name: string;
  originName: string;
  posterUrl: string;
  thumbUrl: string;
  year: number;
  quality: string;
  categories: TaxonomyRef[];
  countries: TaxonomyRef[];
  updatedAt: number;
}

export type ThemeMode = 'dark' | 'light';

export interface UserDataState {
  version: number;
  syncKey: string;
  theme: ThemeMode;
  preferredGenres: string[]; // array of category slugs
  watchHistory: WatchHistoryEntry[];
  likedMovies: SavedMovieSnapshot[];
  dislikedSlugs: string[];
  watchlist: SavedMovieSnapshot[];
  updatedAt: number;
}

export interface RecommendedMovie {
  movie: MovieSummary;
  score: number;
  matchPercent: number;
  reason: string;
  matchedGenres: string[];
}

export interface TasteProfileSummary {
  topGenres: Array<{ slug: string; name: string; weight: number; sharePercent: number }>;
  topCountries: Array<{ slug: string; name: string; weight: number }>;
  totalWatchMinutes: number;
  watchedCount: number;
  likedCount: number;
  watchlistCount: number;
}

export interface CatalogResponse {
  items: MovieSummary[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    totalItemsPerPage: number;
  };
  titlePage?: string;
}

export interface GenreShelf {
  slug: string;
  name: string;
  description: string;
  totalItems: number;
  items: MovieSummary[];
}

export interface PipPlayerSession {
  movie: MovieDetail;
  episodeSlug: string;
  serverIdx: number;
  playerMode: 'hls' | 'embed' | 'trailer';
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  isMuted: boolean;
  playbackRate: number;
}

