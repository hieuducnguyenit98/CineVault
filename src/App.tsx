import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { AccessGate } from './components/AccessGate';
import { AiShortMoviesView } from './components/AiShortMoviesView';
import { DubbedMoviesView } from './components/DubbedMoviesView';
import { ExploreView, type CatalogCategory } from './components/ExploreView';
import { HistoryView } from './components/HistoryView';
import { MiniPlayer } from './components/MiniPlayer';
import { Navbar, type ActiveTab } from './components/Navbar';
import { NewReleasesView } from './components/NewReleasesView';
import { RecommendationsView } from './components/RecommendationsView';
import { TheaterDetailSkeleton } from './components/Skeletons';
import { SyncView } from './components/SyncView';
import { TheaterView } from './components/TheaterView';
import {
  checkAccessSessionApi,
  fetchChineseAiShortMovies,
  fetchCountries,
  fetchDailyUpdates,
  fetchGenreShelves,
  fetchGenres,
  fetchHeroMovies,
  fetchLatestMovies,
  fetchMovieDetail,
  fetchMoviesByCountry,
  fetchMoviesByGenre,
  fetchMoviesByList,
  fetchTheaterReleaseMovies,
  fetchThuyetMinhMovies,
  fetchWeeklyTop,
  pullRemoteProfile,
  pushAndMergeRemoteProfile,
  recordWeeklyWatchApi,
  refreshDailyUpdatesApi,
  searchMovies,
} from './services/movieApi';
import type { AiShortFormatFilter } from './utils/aiShortCatalog';
import {
  computeUnreadNewMovies,
  formatVietnamTimeHHMM,
} from './utils/dailyUpdates';
import { getVietnamDateKey } from './utils/heroSelector';
import { mergeLocalHistoryWithWeeklyTop } from './utils/weeklyTop';
import type {
  CountryItem,
  DailyUpdatesResponse,
  GenreItem,
  GenreShelf,
  MovieDetail,
  MovieSummary,
  PipPlayerSession,
  SavedMovieSnapshot,
  UserDataState,
  WatchHistoryEntry,
  WeeklyTopResponse,
} from './types/movie';
import { CORE_GENRE_SHELF_DEFS, EXTRA_GENRE_SHELF_DEFS } from './utils/genreShelves';
import {
  computeTasteProfileSummary,
  extractFrequentlyWatchedGenres,
  generateRecommendations,
} from './utils/recommendationEngine';
import {
  clearStoredAccessToken,
  loadStoredAccessToken,
  saveStoredAccessToken,
} from './utils/accessGate';
import {
  loadLocalUserState,
  mergeUserStates,
  normalizeUserState,
  sanitizeSyncKey,
  saveLocalUserState,
} from './utils/syncStorage';

function toSavedSnapshot(movie: MovieSummary): SavedMovieSnapshot {
  return {
    slug: movie.slug,
    name: movie.name,
    originName: movie.originName,
    posterUrl: movie.posterUrl,
    thumbUrl: movie.thumbUrl,
    year: movie.year,
    quality: movie.quality,
    categories: movie.categories,
    countries: movie.countries,
    updatedAt: Date.now(),
  };
}

const TAB_ORDER: ActiveTab[] = [
  'explore',
  'new-releases',
  'dubbed',
  'ai-short',
  'recommendations',
  'history',
  'favorites',
  'sync',
];

export default function App() {
  const [userState, setUserState] = useState<UserDataState>(() => loadLocalUserState());
  const [accessStatus, setAccessStatus] = useState<'checking' | 'locked' | 'unlocked'>(() =>
    loadStoredAccessToken() ? 'checking' : 'locked'
  );
  const [activeTab, setActiveTab] = useState<ActiveTab>('explore');
  const [navDirection, setNavDirection] = useState<1 | -1>(1);

  // Catalog & Filter state
  const [category, setCategory] = useState<CatalogCategory>('latest');
  const [selectedGenre, setSelectedGenre] = useState<string>('');
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [searchDraft, setSearchDraft] = useState<string>('');
  const [activeSearch, setActiveSearch] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [movies, setMovies] = useState<MovieSummary[]>([]);
  const [heroMovies, setHeroMovies] = useState<MovieSummary[]>([]);
  const [theaterReleases, setTheaterReleases] = useState<MovieSummary[]>([]);
  const [theaterReleasesLoading, setTheaterReleasesLoading] = useState<boolean>(true);
  const [recommendationPool, setRecommendationPool] = useState<MovieSummary[]>([]);
  const [genres, setGenres] = useState<GenreItem[]>([]);
  const [countries, setCountries] = useState<CountryItem[]>([]);
  const [filtersLoading, setFiltersLoading] = useState<boolean>(true);
  const [poolLoading, setPoolLoading] = useState<boolean>(true);
  const [catalogLoading, setCatalogLoading] = useState<boolean>(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  // Frequently Watched Genre Shelf state
  const [activeFrequentGenre, setActiveFrequentGenre] = useState<string>('');
  const [frequentGenreMovies, setFrequentGenreMovies] = useState<MovieSummary[]>([]);
  const [frequentGenreLoading, setFrequentGenreLoading] = useState<boolean>(false);

  // Categorized Genre Showcase Shelves (Lower Body)
  const [genreShelves, setGenreShelves] = useState<GenreShelf[]>([]);
  const [genreShelvesLoading, setGenreShelvesLoading] = useState<boolean>(true);
  const [genreShelvesError, setGenreShelvesError] = useState<string | null>(null);
  const [extraShelvesLoaded, setExtraShelvesLoaded] = useState<boolean>(false);
  const [extraShelvesLoading, setExtraShelvesLoading] = useState<boolean>(false);

  // Dedicated Thuyết Minh tab state
  const [dubbedMovies, setDubbedMovies] = useState<MovieSummary[]>([]);
  const [dubbedGenre, setDubbedGenre] = useState<string>('');
  const [dubbedCountry, setDubbedCountry] = useState<string>('');
  const [dubbedPage, setDubbedPage] = useState<number>(1);
  const [dubbedTotalPages, setDubbedTotalPages] = useState<number>(1);
  const [dubbedTotalItems, setDubbedTotalItems] = useState<number>(0);
  const [dubbedLoading, setDubbedLoading] = useState<boolean>(true);
  const [dubbedError, setDubbedError] = useState<string | null>(null);

  // Dedicated Chinese AI Short Films tab state
  const [aiShortMovies, setAiShortMovies] = useState<MovieSummary[]>([]);
  const [aiShortGenre, setAiShortGenre] = useState<string>('');
  const [aiShortFormat, setAiShortFormat] = useState<AiShortFormatFilter>('all');
  const [aiShortPage, setAiShortPage] = useState<number>(1);
  const [aiShortTotalPages, setAiShortTotalPages] = useState<number>(1);
  const [aiShortTotalItems, setAiShortTotalItems] = useState<number>(0);
  const [aiShortTotalSourceVideos, setAiShortTotalSourceVideos] = useState<number>(0);
  const [aiShortGroupedCount, setAiShortGroupedCount] = useState<number>(0);
  const [aiShortLoading, setAiShortLoading] = useState<boolean>(true);
  const [aiShortError, setAiShortError] = useState<string | null>(null);

  // Daily Auto-Update New Releases & Notification state
  const [dailyUpdates, setDailyUpdates] = useState<DailyUpdatesResponse | null>(null);
  const [dailyUpdatesLoading, setDailyUpdatesLoading] = useState<boolean>(true);
  const [dailyUpdatesRefreshing, setDailyUpdatesRefreshing] = useState<boolean>(false);
  const [dailyUpdatesError, setDailyUpdatesError] = useState<string | null>(null);
  const [dailyRefreshFeedback, setDailyRefreshFeedback] = useState<string | null>(null);

  // Weekly Top Most-Watched Movies state
  const [serverWeeklyTop, setServerWeeklyTop] = useState<WeeklyTopResponse | null>(null);
  const [weeklyTopLoading, setWeeklyTopLoading] = useState<boolean>(true);

  // Theater / Player state
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [requestedEpisodeSlug, setRequestedEpisodeSlug] = useState<string | undefined>(undefined);
  const [movieDetail, setMovieDetail] = useState<MovieDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [pipSession, setPipSession] = useState<PipPlayerSession | null>(null);

  // Cross-platform sync state
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const [syncBusy, setSyncBusy] = useState<boolean>(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const syncTimerRef = useRef<number | null>(null);

  // Sync HTML .dark class and localStorage
  useEffect(() => {
    saveLocalUserState(userState);
    if (userState.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [userState]);

  // Verify stored access token on mount & listen for revocation
  useEffect(() => {
    const stored = loadStoredAccessToken();
    if (!stored) {
      setAccessStatus('locked');
    } else {
      let cancelled = false;
      checkAccessSessionApi(stored).then((valid) => {
        if (cancelled) return;
        if (valid) {
          setAccessStatus('unlocked');
        } else {
          clearStoredAccessToken();
          setAccessStatus('locked');
        }
      });
      return () => {
        cancelled = true;
      };
    }
  }, []);

  useEffect(() => {
    const handleRevoked = () => {
      setAccessStatus('locked');
    };
    window.addEventListener('cinevault:access-revoked', handleRevoked);
    return () => {
      window.removeEventListener('cinevault:access-revoked', handleRevoked);
    };
  }, []);

  // Handle ?sync=CODE deep-link from another device (only when unlocked)
  useEffect(() => {
    if (accessStatus !== 'unlocked') return;
    const params = new URLSearchParams(window.location.search);
    const linkCode = params.get('sync');
    if (linkCode) {
      const cleaned = sanitizeSyncKey(linkCode);
      if (cleaned.length >= 4) {
        pullRemoteProfile(cleaned)
          .then((remote) => {
            if (remote) {
              setUserState((prev) => mergeUserStates(prev, remote));
              setLastSyncedAt(Date.now());
              setSyncFeedback(`Đã tự động đồng bộ dữ liệu từ mã ${cleaned}.`);
            } else {
              setUserState((prev) => ({ ...prev, syncKey: cleaned, updatedAt: Date.now() }));
            }
          })
          .catch(() => {});
      }
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [accessStatus]);

  const scheduleBackgroundSync = useCallback(
    (nextState: UserDataState) => {
      if (accessStatus !== 'unlocked') return;
      if (syncTimerRef.current) {
        window.clearTimeout(syncTimerRef.current);
      }
      syncTimerRef.current = window.setTimeout(() => {
        pushAndMergeRemoteProfile(nextState.syncKey, nextState)
          .then((res) => {
            setLastSyncedAt(res.syncedAt);
          })
          .catch(() => {});
      }, 1500);
    },
    [accessStatus]
  );

  const updateUserState = useCallback(
    (updater: (prev: UserDataState) => UserDataState) => {
      setUserState((prev) => {
        const next = updater(prev);
        scheduleBackgroundSync(next);
        return next;
      });
    },
    [scheduleBackgroundSync]
  );

  // Load genres, countries, and initial recommendation pool
  useEffect(() => {
    if (accessStatus !== 'unlocked') return;
    setFiltersLoading(true);
    Promise.allSettled([fetchGenres(), fetchCountries()])
      .then(([genresRes, countriesRes]) => {
        setGenres(genresRes.status === 'fulfilled' ? genresRes.value : []);
        setCountries(countriesRes.status === 'fulfilled' ? countriesRes.value : []);
      })
      .finally(() => {
        setFiltersLoading(false);
      });

    setPoolLoading(true);
    setTheaterReleasesLoading(true);
    Promise.allSettled([
      fetchHeroMovies(),
      fetchLatestMovies(1),
      fetchMoviesByList('phim-le', { page: 1, limit: 18 }),
      fetchMoviesByList('phim-bo', { page: 1, limit: 18 }),
      fetchTheaterReleaseMovies({ page: 1, limit: 12 }),
    ])
      .then((results) => {
        const heroRes = results[0];
        const latestRes = results[1];
        const theaterRes = results[4];
        const map = new Map<string, MovieSummary>();
        for (const r of results.slice(1)) {
          if (r.status === 'fulfilled') {
            for (const item of (r.value as { items: MovieSummary[] }).items) {
              if (!map.has(item.slug)) {
                map.set(item.slug, item);
              }
            }
          }
        }
        if (heroRes.status === 'fulfilled' && heroRes.value.movies.length > 0) {
          const heroList = heroRes.value.movies.slice(0, 10);
          setHeroMovies(heroList);
          for (const item of heroList) {
            if (!map.has(item.slug)) {
              map.set(item.slug, item);
            }
          }
        } else if (latestRes.status === 'fulfilled') {
          setHeroMovies(latestRes.value.items.slice(0, 10));
        }
        if (theaterRes.status === 'fulfilled') {
          setTheaterReleases((theaterRes.value as { items: MovieSummary[] }).items.slice(0, 12));
        }
        setRecommendationPool(Array.from(map.values()));
      })
      .finally(() => {
        setPoolLoading(false);
        setTheaterReleasesLoading(false);
      });
  }, [accessStatus]);

  const loadCoreGenreShelves = useCallback(() => {
    if (accessStatus !== 'unlocked') return;
    setGenreShelvesLoading(true);
    setGenreShelvesError(null);
    fetchGenreShelves(
      CORE_GENRE_SHELF_DEFS.map((g) => g.slug),
      6
    )
      .then((shelves) => {
        setGenreShelves(shelves);
        setExtraShelvesLoaded(false);
        setRecommendationPool((prev) => {
          const map = new Map(prev.map((m) => [m.slug, m]));
          for (const shelf of shelves) {
            for (const item of shelf.items) {
              if (!map.has(item.slug)) map.set(item.slug, item);
            }
          }
          return Array.from(map.values());
        });
      })
      .catch((err) => {
        setGenreShelvesError(
          err instanceof Error ? err.message : 'Không thể tải danh sách phim theo từng thể loại.'
        );
      })
      .finally(() => {
        setGenreShelvesLoading(false);
      });
  }, [accessStatus]);

  useEffect(() => {
    if (accessStatus === 'unlocked') {
      loadCoreGenreShelves();
    }
  }, [accessStatus, loadCoreGenreShelves]);

  const handleLoadExtraShelves = useCallback(() => {
    if (extraShelvesLoading || extraShelvesLoaded) return;
    setExtraShelvesLoading(true);
    const existingSlugs = genreShelves.flatMap((s) => s.items.map((m) => m.slug));
    fetchGenreShelves(
      EXTRA_GENRE_SHELF_DEFS.map((g) => g.slug),
      6,
      existingSlugs
    )
      .then((more) => {
        setGenreShelves((prev) => {
          const seen = new Set(prev.map((s) => s.slug));
          return [...prev, ...more.filter((s) => !seen.has(s.slug))];
        });
        setExtraShelvesLoaded(true);
        setRecommendationPool((prev) => {
          const map = new Map(prev.map((m) => [m.slug, m]));
          for (const shelf of more) {
            for (const item of shelf.items) {
              if (!map.has(item.slug)) map.set(item.slug, item);
            }
          }
          return Array.from(map.values());
        });
      })
      .catch(() => {})
      .finally(() => {
        setExtraShelvesLoading(false);
      });
  }, [extraShelvesLoading, extraShelvesLoaded, genreShelves]);

  // Compute user's top frequently watched genres
  const frequentGenres = useMemo(
    () => extractFrequentlyWatchedGenres(userState, genres, 4),
    [userState, genres]
  );

  useEffect(() => {
    if (frequentGenres.length === 0) return;
    if (!activeFrequentGenre || !frequentGenres.some((fg) => fg.slug === activeFrequentGenre)) {
      setActiveFrequentGenre(frequentGenres[0].slug);
    }
  }, [frequentGenres, activeFrequentGenre]);

  // Fetch movies for the active frequently watched genre
  useEffect(() => {
    if (accessStatus !== 'unlocked' || !activeFrequentGenre) return;
    let cancelled = false;
    setFrequentGenreLoading(true);
    fetchMoviesByGenre(activeFrequentGenre, 1, 12)
      .then((res) => {
        if (!cancelled) {
          setFrequentGenreMovies(res.items);
          setRecommendationPool((prev) => {
            const map = new Map(prev.map((m) => [m.slug, m]));
            for (const item of res.items) {
              if (!map.has(item.slug)) map.set(item.slug, item);
            }
            return Array.from(map.values());
          });
        }
      })
      .catch(() => {
        if (!cancelled) setFrequentGenreMovies([]);
      })
      .finally(() => {
        if (!cancelled) setFrequentGenreLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [accessStatus, activeFrequentGenre]);

  // Load main catalog whenever search / category / genre / country / page change
  const loadCatalog = useCallback(async () => {
    if (accessStatus !== 'unlocked') return;
    setCatalogLoading(true);
    setCatalogError(null);
    try {
      let res;
      if (activeSearch) {
        res = await searchMovies(activeSearch, page, 24);
      } else if (category !== 'latest') {
        res = await fetchMoviesByList(category, {
          page,
          limit: 24,
          category: selectedGenre,
          country: selectedCountry,
        });
      } else if (selectedGenre) {
        res = await fetchMoviesByGenre(selectedGenre, page, 24, selectedCountry);
      } else if (selectedCountry) {
        res = await fetchMoviesByCountry(selectedCountry, page, 24);
      } else {
        res = await fetchLatestMovies(page);
      }
      setMovies(res.items);
      setTotalPages(Math.max(1, res.pagination.totalPages));
      setTotalItems(Math.max(res.items.length, res.pagination.totalItems || 0));
      if (
        !activeSearch &&
        !selectedGenre &&
        !selectedCountry &&
        category === 'latest' &&
        page === 1 &&
        res.items.length > 0
      ) {
        setHeroMovies((prev) => (prev.length >= 10 ? prev : res.items.slice(0, 10)));
      }
      setRecommendationPool((prev) => {
        const map = new Map(prev.map((m) => [m.slug, m]));
        for (const item of res.items) {
          if (!map.has(item.slug)) map.set(item.slug, item);
        }
        return Array.from(map.values());
      });
    } catch (err) {
      setCatalogError(
        err instanceof Error ? err.message : 'Không thể tải danh sách phim từ máy chủ.'
      );
    } finally {
      setCatalogLoading(false);
    }
  }, [accessStatus, activeSearch, selectedGenre, selectedCountry, category, page]);

  useEffect(() => {
    if (accessStatus === 'unlocked') {
      loadCatalog();
    }
  }, [accessStatus, loadCatalog]);

  const loadDubbedCatalog = useCallback(async () => {
    if (accessStatus !== 'unlocked') return;
    setDubbedLoading(true);
    setDubbedError(null);
    try {
      const res = await fetchThuyetMinhMovies({
        page: dubbedPage,
        limit: 24,
        category: dubbedGenre,
        country: dubbedCountry,
      });
      setDubbedMovies(res.items);
      setDubbedTotalPages(Math.max(1, res.pagination.totalPages));
      setDubbedTotalItems(Math.max(res.items.length, res.pagination.totalItems || 0));
      setRecommendationPool((prev) => {
        const map = new Map(prev.map((m) => [m.slug, m]));
        for (const item of res.items) {
          if (!map.has(item.slug)) map.set(item.slug, item);
        }
        return Array.from(map.values());
      });
    } catch (err) {
      setDubbedError(
        err instanceof Error ? err.message : 'Không thể tải danh sách phim thuyết minh.'
      );
    } finally {
      setDubbedLoading(false);
    }
  }, [accessStatus, dubbedPage, dubbedGenre, dubbedCountry]);

  useEffect(() => {
    if (accessStatus === 'unlocked') {
      loadDubbedCatalog();
    }
  }, [accessStatus, loadDubbedCatalog]);

  const loadAiShortCatalog = useCallback(async () => {
    if (accessStatus !== 'unlocked') return;
    setAiShortLoading(true);
    setAiShortError(null);
    try {
      const res = await fetchChineseAiShortMovies({
        page: aiShortPage,
        limit: 24,
        category: aiShortGenre,
        format: aiShortFormat,
      });
      setAiShortMovies(res.items);
      setAiShortTotalPages(Math.max(1, res.pagination.totalPages));
      setAiShortTotalItems(Math.max(res.items.length, res.pagination.totalItems || 0));
      setAiShortTotalSourceVideos(res.totalSourceVideos ?? 0);
      setAiShortGroupedCount(res.groupedSeriesCount ?? 0);
      setRecommendationPool((prev) => {
        const map = new Map(prev.map((m) => [m.slug, m]));
        for (const item of res.items) {
          if (!map.has(item.slug)) map.set(item.slug, item);
        }
        return Array.from(map.values());
      });
    } catch (err) {
      setAiShortError(
        err instanceof Error ? err.message : 'Không thể tải danh sách phim ngắn AI Trung Quốc.'
      );
    } finally {
      setAiShortLoading(false);
    }
  }, [accessStatus, aiShortPage, aiShortGenre, aiShortFormat]);

  useEffect(() => {
    if (accessStatus === 'unlocked') {
      loadAiShortCatalog();
    }
  }, [accessStatus, loadAiShortCatalog]);

  const dailyUpdatesRef = useRef<DailyUpdatesResponse | null>(null);
  useEffect(() => {
    dailyUpdatesRef.current = dailyUpdates;
  }, [dailyUpdates]);

  // Daily Auto-Update loader + periodic background poll & day-rollover check
  const loadDailyUpdates = useCallback(async (silent = false) => {
    if (accessStatus !== 'unlocked') return;
    if (!silent && !dailyUpdatesRef.current) {
      setDailyUpdatesLoading(true);
      setDailyUpdatesError(null);
    }
    try {
      const res = await fetchDailyUpdates();
      dailyUpdatesRef.current = res;
      setDailyUpdates(res);
      setDailyUpdatesError(null);
      setRecommendationPool((prev) => {
        const map = new Map(prev.map((m) => [m.slug, m]));
        for (const entry of res.entries) {
          if (!map.has(entry.movie.slug)) map.set(entry.movie.slug, entry.movie);
        }
        return Array.from(map.values());
      });
    } catch (err) {
      if (!silent) {
        setDailyUpdatesError(
          err instanceof Error ? err.message : 'Không thể kiểm tra danh sách phim mới hôm nay.'
        );
      }
    } finally {
      if (!silent) setDailyUpdatesLoading(false);
    }
  }, [accessStatus]);

  useEffect(() => {
    if (accessStatus !== 'unlocked') return;
    loadDailyUpdates(false);

    const intervalId = window.setInterval(() => {
      loadDailyUpdates(true);
    }, 15 * 60 * 1000);

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'hidden') return;
      const latest = dailyUpdatesRef.current;
      const todayKey = getVietnamDateKey();
      if (
        !latest ||
        latest.dateKey !== todayKey ||
        Date.now() - latest.lastUpdatedAt >= 15 * 60 * 1000
      ) {
        loadDailyUpdates(true);
      }
    };

    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
    };
  }, [accessStatus, loadDailyUpdates]);

  const unreadNewInfo = useMemo(
    () =>
      computeUnreadNewMovies(
        dailyUpdates?.entries ?? [],
        userState.acknowledgedNewSlugs ?? []
      ),
    [dailyUpdates, userState.acknowledgedNewSlugs]
  );

  // Load rolling 7-day Top Watched ranking on unlock & merge with local browser watchHistory
  useEffect(() => {
    if (accessStatus !== 'unlocked') return;
    let cancelled = false;
    setWeeklyTopLoading(true);
    fetchWeeklyTop(10)
      .then((res) => {
        if (!cancelled) setServerWeeklyTop(res);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setWeeklyTopLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [accessStatus]);

  const weeklyTop = useMemo(
    () =>
      mergeLocalHistoryWithWeeklyTop(
        serverWeeklyTop,
        userState.watchHistory,
        userState.syncKey,
        Date.now(),
        10
      ),
    [serverWeeklyTop, userState.watchHistory, userState.syncKey]
  );

  const recordedWeeklyWatchRef = useRef<Map<string, number>>(new Map());
  const movieDetailRef = useRef<MovieDetail | null>(null);
  useEffect(() => {
    movieDetailRef.current = movieDetail;
  }, [movieDetail]);

  const acknowledgeMovieSlugs = useCallback(
    (slugs: string[]) => {
      if (slugs.length === 0) return;
      updateUserState((prev) => {
        const current = prev.acknowledgedNewSlugs ?? [];
        const currentSet = new Set(current);
        if (slugs.every((s) => currentSet.has(s))) {
          return prev;
        }
        return {
          ...prev,
          acknowledgedNewSlugs: Array.from(new Set([...current, ...slugs])).slice(-400),
          updatedAt: Date.now(),
        };
      });
    },
    [updateUserState]
  );

  const handleMarkAllNewRead = useCallback(() => {
    if (!dailyUpdates) return;
    const allNewTodaySlugs = dailyUpdates.entries
      .filter((e) => e.isNewToday)
      .map((e) => e.movie.slug);
    acknowledgeMovieSlugs(allNewTodaySlugs);
    setDailyRefreshFeedback('Đã đánh dấu đã xem toàn bộ phim mới hôm nay.');
  }, [dailyUpdates, acknowledgeMovieSlugs]);

  const handleRefreshDailyUpdates = useCallback(async () => {
    if (dailyUpdatesRefreshing) return;
    setDailyUpdatesRefreshing(true);
    setDailyRefreshFeedback(null);
    setDailyUpdatesError(null);
    try {
      const { snapshot, addedNowCount } = await refreshDailyUpdatesApi();
      setDailyUpdates(snapshot);
      const timeLabel = formatVietnamTimeHHMM(snapshot.lastUpdatedAt);
      setDailyRefreshFeedback(
        addedNowCount > 0
          ? `Đã cập nhật lúc ${timeLabel} · Phát hiện thêm ${addedNowCount} phim / tập mới.`
          : `Đã kiểm tra lúc ${timeLabel} · Danh sách đang là mới nhất.`
      );
    } catch (err) {
      setDailyRefreshFeedback(
        err instanceof Error ? err.message : 'Không thể kiểm tra phim mới lúc này.'
      );
    } finally {
      setDailyUpdatesRefreshing(false);
    }
  }, [dailyUpdatesRefreshing]);

  const openMovie = useCallback(
    async (slug: string, episodeSlug?: string) => {
      acknowledgeMovieSlugs([slug]);
      setSelectedSlug(slug);
      setRequestedEpisodeSlug(episodeSlug);
      setPipSession(null);
      setDetailLoading(true);
      setDetailError(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      try {
        const detail = await fetchMovieDetail(slug);
        setMovieDetail(detail);
        const epSlug = episodeSlug || detail.servers?.[0]?.episodes?.[0]?.slug || '';
        const watchTrackKey = `${detail.slug}::${epSlug}`;
        const lastPing = recordedWeeklyWatchRef.current.get(watchTrackKey) ?? 0;
        if (Date.now() - lastPing >= 5 * 60 * 1000) {
          recordedWeeklyWatchRef.current.set(watchTrackKey, Date.now());
          recordWeeklyWatchApi({
            slug: detail.slug,
            viewerKey: userState.syncKey,
            episodeSlug: epSlug,
            progressSeconds: 0,
            movie: detail,
          })
            .then((updated) => setServerWeeklyTop(updated))
            .catch(() => {});
        }
      } catch (err) {
        setDetailError(
          err instanceof Error ? err.message : 'Không thể tải thông tin chi tiết phim.'
        );
        setMovieDetail(null);
      } finally {
        setDetailLoading(false);
      }
    },
    [acknowledgeMovieSlugs, userState.syncKey]
  );

  const recommendations = useMemo(
    () =>
      generateRecommendations(recommendationPool, userState, genres, {
        excludeWatched: false,
        limit: 18,
      }),
    [recommendationPool, userState, genres]
  );

  const tasteProfile = useMemo(
    () => computeTasteProfileSummary(userState, genres),
    [userState, genres]
  );

  const similarMovies = useMemo(() => {
    if (!movieDetail) return [];
    const targetGenres = new Set(movieDetail.categories.map((c) => c.slug));
    return recommendationPool
      .filter((m) => m.slug !== movieDetail.slug)
      .sort((a, b) => {
        const aMatch = a.categories.filter((c) => targetGenres.has(c.slug)).length;
        const bMatch = b.categories.filter((c) => targetGenres.has(c.slug)).length;
        return bMatch - aMatch || b.rating.voteAverage - a.rating.voteAverage;
      })
      .slice(0, 6);
  }, [movieDetail, recommendationPool]);

  const handleToggleTheme = () => {
    updateUserState((prev) => ({
      ...prev,
      theme: prev.theme === 'dark' ? 'light' : 'dark',
      updatedAt: Date.now(),
    }));
  };

  const navigateToTab = useCallback(
    (nextTab: ActiveTab) => {
      const prevIdx = TAB_ORDER.indexOf(activeTab);
      const nextIdx = TAB_ORDER.indexOf(nextTab);
      setNavDirection(nextIdx >= prevIdx ? 1 : -1);
      setSelectedSlug(null);
      setActiveTab(nextTab);
    },
    [activeTab]
  );

  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    navigateToTab('explore');
    setSelectedGenre('');
    setSelectedCountry('');
    setPage(1);
    setActiveSearch(searchDraft.trim());
  };

  const handleClearFilters = () => {
    setSearchDraft('');
    setActiveSearch('');
    setSelectedGenre('');
    setSelectedCountry('');
    setCategory('latest');
    setPage(1);
  };

  const handleSelectCategory = (cat: CatalogCategory) => {
    setCategory(cat);
    setActiveSearch('');
    setSearchDraft('');
    setPage(1);
  };

  const handleSelectGenre = (slug: string) => {
    navigateToTab('explore');
    setSelectedGenre(slug);
    setActiveSearch('');
    setSearchDraft('');
    setPage(1);
  };

  const handleSelectCountry = (slug: string) => {
    navigateToTab('explore');
    setSelectedCountry(slug);
    setActiveSearch('');
    setSearchDraft('');
    setPage(1);
  };

  const handleProgressSave = useCallback(
    (entry: Omit<WatchHistoryEntry, 'watchedAt'>) => {
      updateUserState((prev) => {
        const existing = prev.watchHistory.find((item) => item.slug === entry.slug);
        const filtered = prev.watchHistory.filter((item) => item.slug !== entry.slug);
        const mergedWatched = Array.from(
          new Set([...(existing?.watchedEpisodes ?? []), ...(entry.watchedEpisodes ?? [])])
        ).slice(0, 500);
        const nextEntry: WatchHistoryEntry = {
          ...entry,
          watchedEpisodes: mergedWatched,
          watchedAt: Date.now(),
        };
        return {
          ...prev,
          watchHistory: [nextEntry, ...filtered].slice(0, 120),
          updatedAt: Date.now(),
        };
      });

      const watchTrackKey = `${entry.slug}::${entry.episodeSlug}`;
      const lastPing = recordedWeeklyWatchRef.current.get(watchTrackKey) ?? 0;
      if (Date.now() - lastPing >= 60 * 1000) {
        recordedWeeklyWatchRef.current.set(watchTrackKey, Date.now());
        const detail = movieDetailRef.current;
        const summary: MovieSummary =
          detail && detail.slug === entry.slug
            ? detail
            : {
                id: entry.slug,
                name: entry.name,
                originName: entry.originName,
                slug: entry.slug,
                type: entry.slug.startsWith('yt-ai--') ? 'ai-short' : 'series',
                posterUrl: entry.posterUrl,
                thumbUrl: entry.thumbUrl,
                year: entry.year,
                quality: entry.quality,
                lang: entry.slug.startsWith('yt-ai--') ? 'Phim Ngắn AI' : 'Vietsub',
                time: '',
                episodeCurrent: entry.episodeName,
                categories: entry.categories,
                countries: entry.countries,
                rating: { voteAverage: 0, voteCount: 0 },
                modifiedAt: '',
              };
        recordWeeklyWatchApi({
          slug: entry.slug,
          viewerKey: userState.syncKey,
          episodeSlug: entry.episodeSlug,
          progressSeconds: entry.progressSeconds,
          movie: summary,
        })
          .then((updated) => setServerWeeklyTop(updated))
          .catch(() => {});
      }
    },
    [updateUserState, userState.syncKey]
  );

  const handleToggleLike = (movie: MovieSummary) => {
    updateUserState((prev) => {
      const exists = prev.likedMovies.some((m) => m.slug === movie.slug);
      const nextLiked = exists
        ? prev.likedMovies.filter((m) => m.slug !== movie.slug)
        : [toSavedSnapshot(movie), ...prev.likedMovies];
      const nextDisliked = exists
        ? prev.dislikedSlugs
        : prev.dislikedSlugs.filter((s) => s !== movie.slug);
      return {
        ...prev,
        likedMovies: nextLiked,
        dislikedSlugs: nextDisliked,
        updatedAt: Date.now(),
      };
    });
  };

  const handleToggleDislike = (slug: string) => {
    updateUserState((prev) => {
      const exists = prev.dislikedSlugs.includes(slug);
      const nextDisliked = exists
        ? prev.dislikedSlugs.filter((s) => s !== slug)
        : [...prev.dislikedSlugs, slug];
      const nextLiked = exists
        ? prev.likedMovies
        : prev.likedMovies.filter((m) => m.slug !== slug);
      return {
        ...prev,
        dislikedSlugs: nextDisliked,
        likedMovies: nextLiked,
        updatedAt: Date.now(),
      };
    });
  };

  const handleToggleWatchlist = (movie: MovieSummary) => {
    updateUserState((prev) => {
      const exists = prev.watchlist.some((m) => m.slug === movie.slug);
      const nextWatchlist = exists
        ? prev.watchlist.filter((m) => m.slug !== movie.slug)
        : [toSavedSnapshot(movie), ...prev.watchlist];
      return {
        ...prev,
        watchlist: nextWatchlist,
        updatedAt: Date.now(),
      };
    });
  };

  const handleTogglePreferredGenre = (slug: string) => {
    updateUserState((prev) => {
      const exists = prev.preferredGenres.includes(slug);
      const nextGenres = exists
        ? prev.preferredGenres.filter((g) => g !== slug)
        : [...prev.preferredGenres, slug];
      return {
        ...prev,
        preferredGenres: nextGenres,
        updatedAt: Date.now(),
      };
    });
  };

  const handlePushSync = async () => {
    setSyncBusy(true);
    setSyncFeedback(null);
    try {
      const res = await pushAndMergeRemoteProfile(userState.syncKey, userState);
      setUserState(res.profile);
      setLastSyncedAt(res.syncedAt);
      setSyncFeedback(`Đã đồng bộ thành công với mã ${res.profile.syncKey}.`);
    } catch (err) {
      setSyncFeedback(
        err instanceof Error ? err.message : 'Không thể kết nối máy chủ đồng bộ lúc này.'
      );
    } finally {
      setSyncBusy(false);
    }
  };

  const handleConnectSyncKey = async (code: string) => {
    setSyncBusy(true);
    setSyncFeedback(null);
    try {
      const remote = await pullRemoteProfile(code);
      if (!remote) {
        setSyncFeedback(`Không tìm thấy dữ liệu trên máy chủ cho mã ${code}.`);
        return;
      }
      const merged = mergeUserStates(userState, { ...remote, syncKey: code });
      const pushed = await pushAndMergeRemoteProfile(code, merged);
      setUserState(pushed.profile);
      setLastSyncedAt(pushed.syncedAt);
      setSyncFeedback(`Đã kết nối và hợp nhất dữ liệu từ mã ${code}.`);
    } catch (err) {
      setSyncFeedback(err instanceof Error ? err.message : 'Lỗi kết nối đồng bộ.');
    } finally {
      setSyncBusy(false);
    }
  };

  const handleImportState = (incoming: UserDataState) => {
    const normalized = normalizeUserState(incoming);
    setUserState((prev) => mergeUserStates(prev, normalized));
    setSyncFeedback('Đã nhập và hợp nhất dữ liệu sao lưu thành công.');
  };

  const isLiked = (slug: string) => userState.likedMovies.some((m) => m.slug === slug);
  const isInWatchlist = (slug: string) => userState.watchlist.some((m) => m.slug === slug);

  const viewKey = selectedSlug ? `theater:${selectedSlug}` : activeTab;
  const viewTransitionClass = selectedSlug
    ? 'animate-theater-enter'
    : navDirection >= 0
    ? 'animate-tab-forward'
    : 'animate-tab-backward';

  if (accessStatus === 'checking') {
    return (
      <div
        role="status"
        aria-label="Đang kiểm tra quyền truy cập"
        className="min-h-screen flex items-center justify-center bg-[#F5F3EE] text-zinc-700 dark:bg-[#070709] dark:text-zinc-300"
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#9A7418]/30 border-t-[#9A7418] dark:border-[#D4AF37]/25 dark:border-t-[#D4AF37]" />
          <span className="text-xs font-medium tracking-wide">Đang xác thực phiên truy cập...</span>
        </div>
      </div>
    );
  }

  if (accessStatus === 'locked') {
    return (
      <AccessGate
        theme={userState.theme}
        onToggleTheme={handleToggleTheme}
        onUnlocked={(token) => {
          saveStoredAccessToken(token);
          setAccessStatus('unlocked');
        }}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F3EE] text-zinc-900 dark:bg-[#070709] dark:text-zinc-100 pb-20 md:pb-0">
      <Navbar
        activeTab={activeTab}
        onNavigate={navigateToTab}
        onFocusSearch={() => {
          navigateToTab('explore');
          window.setTimeout(() => {
            searchInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            searchInputRef.current?.focus();
          }, 80);
        }}
        theme={userState.theme}
        onToggleTheme={handleToggleTheme}
        newMoviesCount={unreadNewInfo.unreadCount}
        historyCount={userState.watchHistory.length}
        favoritesCount={userState.watchlist.length + userState.likedMovies.length}
      />

      <main className="w-full flex-1 overflow-x-clip">
        <div key={viewKey} className={viewTransitionClass}>
          {!selectedSlug && activeTab === 'explore' ? (
            <ExploreView
              searchInputRef={searchInputRef}
              searchDraft={searchDraft}
              activeSearch={activeSearch}
              onSearchDraftChange={setSearchDraft}
              onSearchSubmit={handleSearchSubmit}
              onClearFilters={handleClearFilters}
              theme={userState.theme}
              onToggleTheme={handleToggleTheme}
              category={category}
              onSelectCategory={handleSelectCategory}
              selectedGenre={selectedGenre}
              onSelectGenre={handleSelectGenre}
              selectedCountry={selectedCountry}
              onSelectCountry={handleSelectCountry}
              genres={genres}
              countries={countries}
              filtersLoading={filtersLoading}
              poolLoading={poolLoading}
              movies={movies}
              heroMovies={heroMovies}
              theaterReleases={theaterReleases}
              theaterReleasesLoading={theaterReleasesLoading}
              recommendations={recommendations}
              frequentGenres={frequentGenres}
              activeFrequentGenre={activeFrequentGenre}
              onSelectFrequentGenre={setActiveFrequentGenre}
              frequentGenreMovies={frequentGenreMovies}
              frequentGenreLoading={frequentGenreLoading}
              genreShelves={genreShelves}
              genreShelvesLoading={genreShelvesLoading}
              genreShelvesError={genreShelvesError}
              extraShelvesLoaded={extraShelvesLoaded}
              extraShelvesLoading={extraShelvesLoading}
              onLoadExtraShelves={handleLoadExtraShelves}
              onRetryGenreShelves={loadCoreGenreShelves}
              watchHistory={userState.watchHistory}
              weeklyTop={weeklyTop}
              weeklyTopLoading={weeklyTopLoading}
              loading={catalogLoading}
              error={catalogError}
              page={page}
              totalPages={totalPages}
              totalItems={totalItems}
              onPageChange={(nextPage) => {
                setPage(nextPage);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onRetry={loadCatalog}
              onSelectMovie={openMovie}
              onViewAllRecommendations={() => navigateToTab('recommendations')}
              isInWatchlist={isInWatchlist}
              onToggleWatchlist={handleToggleWatchlist}
            />
          ) : (
            <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
              {selectedSlug ? (
                detailLoading ? (
                  <TheaterDetailSkeleton />
                ) : detailError || !movieDetail ? (
                  <div className="rounded-2xl border border-zinc-900/10 bg-white p-10 text-center dark:border-white/10 dark:bg-[#101015]">
                    <p className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                      {detailError || 'Không tìm thấy phim.'}
                    </p>
                    <button
                      type="button"
                      onClick={() => setSelectedSlug(null)}
                      className="mt-4 min-h-[44px] rounded-lg bg-[#9A7418] px-5 py-2 text-xs font-semibold text-white dark:bg-[#D4AF37] dark:text-[#09090B] cursor-pointer"
                    >
                      Quay lại trang chủ
                    </button>
                  </div>
                ) : (
                  <TheaterView
                    movie={movieDetail}
                    initialHistory={userState.watchHistory.find((h) => h.slug === movieDetail.slug)}
                    requestedEpisodeSlug={requestedEpisodeSlug}
                    preferNarration={activeTab === 'dubbed'}
                    similarMovies={similarMovies}
                    isLiked={isLiked(movieDetail.slug)}
                    isDisliked={userState.dislikedSlugs.includes(movieDetail.slug)}
                    isInWatchlist={isInWatchlist(movieDetail.slug)}
                    onBack={() => setSelectedSlug(null)}
                    onTogglePip={(session) => {
                      setPipSession(session);
                      setSelectedSlug(null);
                    }}
                    onSelectMovie={openMovie}
                    onSelectGenre={handleSelectGenre}
                    onSelectCountry={handleSelectCountry}
                    onProgressSave={handleProgressSave}
                    onToggleLike={() => handleToggleLike(movieDetail)}
                    onToggleDislike={() => handleToggleDislike(movieDetail.slug)}
                    onToggleWatchlist={() => handleToggleWatchlist(movieDetail)}
                  />
                )
              ) : activeTab === 'new-releases' ? (
                <NewReleasesView
                  data={dailyUpdates}
                  loading={dailyUpdatesLoading}
                  refreshing={dailyUpdatesRefreshing}
                  error={dailyUpdatesError}
                  refreshFeedback={dailyRefreshFeedback}
                  acknowledgedSlugs={userState.acknowledgedNewSlugs ?? []}
                  unreadCount={unreadNewInfo.unreadCount}
                  watchHistory={userState.watchHistory}
                  onRefreshNow={handleRefreshDailyUpdates}
                  onMarkAllRead={handleMarkAllNewRead}
                  onRetry={() => loadDailyUpdates(false)}
                  onSelectMovie={openMovie}
                />
              ) : activeTab === 'dubbed' ? (
                <DubbedMoviesView
                  genres={genres}
                  countries={countries}
                  filtersLoading={filtersLoading}
                  selectedGenre={dubbedGenre}
                  selectedCountry={dubbedCountry}
                  onSelectGenre={(slug) => {
                    setDubbedGenre(slug);
                    setDubbedPage(1);
                  }}
                  onSelectCountry={(slug) => {
                    setDubbedCountry(slug);
                    setDubbedPage(1);
                  }}
                  onClearFilters={() => {
                    setDubbedGenre('');
                    setDubbedCountry('');
                    setDubbedPage(1);
                  }}
                  movies={dubbedMovies}
                  watchHistory={userState.watchHistory}
                  loading={dubbedLoading}
                  error={dubbedError}
                  page={dubbedPage}
                  totalPages={dubbedTotalPages}
                  totalItems={dubbedTotalItems}
                  onPageChange={(nextPage) => {
                    setDubbedPage(nextPage);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  onRetry={loadDubbedCatalog}
                  onSelectMovie={openMovie}
                />
              ) : activeTab === 'ai-short' ? (
                <AiShortMoviesView
                  genres={genres}
                  filtersLoading={filtersLoading}
                  selectedGenre={aiShortGenre}
                  selectedFormat={aiShortFormat}
                  onSelectGenre={(slug) => {
                    setAiShortGenre(slug);
                    setAiShortPage(1);
                  }}
                  onSelectFormat={(fmt) => {
                    setAiShortFormat(fmt);
                    setAiShortPage(1);
                  }}
                  onClearFilters={() => {
                    setAiShortGenre('');
                    setAiShortFormat('all');
                    setAiShortPage(1);
                  }}
                  movies={aiShortMovies}
                  watchHistory={userState.watchHistory}
                  loading={aiShortLoading}
                  error={aiShortError}
                  page={aiShortPage}
                  totalPages={aiShortTotalPages}
                  totalItems={aiShortTotalItems}
                  totalSourceVideos={aiShortTotalSourceVideos}
                  groupedSeriesCount={aiShortGroupedCount}
                  onPageChange={(nextPage) => {
                    setAiShortPage(nextPage);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  onRetry={loadAiShortCatalog}
                  onSelectMovie={openMovie}
                />
              ) : activeTab === 'recommendations' ? (
                <RecommendationsView
                  genres={genres}
                  filtersLoading={filtersLoading}
                  preferredGenres={userState.preferredGenres}
                  onTogglePreferredGenre={handleTogglePreferredGenre}
                  tasteProfile={tasteProfile}
                  frequentGenres={frequentGenres}
                  activeFrequentGenre={activeFrequentGenre}
                  onSelectFrequentGenre={setActiveFrequentGenre}
                  frequentGenreMovies={frequentGenreMovies}
                  frequentGenreLoading={frequentGenreLoading}
                  recommendations={recommendations}
                  poolLoading={poolLoading}
                  onSelectMovie={(s) => openMovie(s)}
                />
              ) : activeTab === 'history' || activeTab === 'favorites' ? (
                <HistoryView
                  mode={activeTab}
                  watchHistory={userState.watchHistory}
                  likedMovies={userState.likedMovies}
                  watchlist={userState.watchlist}
                  onSelectMovie={openMovie}
                  onRemoveHistoryItem={(slug) =>
                    updateUserState((prev) => ({
                      ...prev,
                      watchHistory: prev.watchHistory.filter((h) => h.slug !== slug),
                      updatedAt: Date.now(),
                    }))
                  }
                  onClearHistory={() =>
                    updateUserState((prev) => ({
                      ...prev,
                      watchHistory: [],
                      updatedAt: Date.now(),
                    }))
                  }
                  onRemoveFromWatchlist={(slug) =>
                    updateUserState((prev) => ({
                      ...prev,
                      watchlist: prev.watchlist.filter((w) => w.slug !== slug),
                      updatedAt: Date.now(),
                    }))
                  }
                  onExploreClick={() => navigateToTab('explore')}
                />
              ) : (
                <SyncView
                  userState={userState}
                  lastSyncedAt={lastSyncedAt}
                  syncBusy={syncBusy}
                  syncFeedback={syncFeedback}
                  onPushSync={handlePushSync}
                  onConnectSyncKey={handleConnectSyncKey}
                  onImportState={handleImportState}
                />
              )}
            </div>
          )}
        </div>
      </main>

      {/* Floating Picture-in-Picture Mini-Player */}
      {pipSession && !selectedSlug && (
        <MiniPlayer
          session={pipSession}
          onExpand={(slug, epSlug) => {
            setPipSession(null);
            openMovie(slug, epSlug);
          }}
          onClose={() => setPipSession(null)}
          onProgressSave={handleProgressSave}
        />
      )}

      <footer className="border-t border-zinc-900/10 py-6 text-xs text-zinc-500 dark:border-white/10 dark:text-zinc-400">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>CineVault — Không gian xem phim cá nhân. Dữ liệu lưu trực tiếp trên thiết bị và đồng bộ theo mã riêng.</p>
          <div className="flex items-center gap-5">
            <button
              type="button"
              onClick={() => navigateToTab('recommendations')}
              className="hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer"
            >
              Gợi ý theo gu phim
            </button>
            <button
              type="button"
              onClick={() => navigateToTab('sync')}
              className="hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer"
            >
              Đồng bộ đa nền tảng
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
