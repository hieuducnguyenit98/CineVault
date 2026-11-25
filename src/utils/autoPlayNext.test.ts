import test from 'node:test';
import assert from 'node:assert/strict';
import type { EpisodeItem } from '../types/movie';
import {
  AUTO_PLAY_COUNTDOWN_SECONDS,
  appendYoutubeJsApiParams,
  canAutoPlayNextEpisode,
  computeCountdownProgress,
  isSeriesMovie,
  isYoutubeEndedPostMessage,
  resolveSequentialNextEpisode,
} from './autoPlayNext';

function makeEpisode(num: number): EpisodeItem {
  return {
    name: `Tập ${num}`,
    slug: `tap-${num}`,
    filename: `ep-${num}.mp4`,
    linkEmbed: `https://player.example.com/ep-${num}`,
    linkM3u8: `https://cdn.example.com/ep-${num}.m3u8`,
  };
}

test('isSeriesMovie returns true for multi-episode series and false for single films or 1-episode items', () => {
  assert.equal(isSeriesMovie({ type: 'series' }, 12), true);
  assert.equal(isSeriesMovie({ type: 'hoathinh' }, 24), true);
  assert.equal(isSeriesMovie({ type: 'tvshows' }, 8), true);
  assert.equal(isSeriesMovie({ type: 'single' }, 1), false);
  assert.equal(isSeriesMovie({ type: 'single' }, 2), false);
  assert.equal(isSeriesMovie({ type: 'series' }, 1), false);
  assert.equal(isSeriesMovie(null, 5), false);
});

test('resolveSequentialNextEpisode advances linearly and returns null on final episode', () => {
  const episodes = [makeEpisode(1), makeEpisode(2), makeEpisode(3)];

  assert.equal(resolveSequentialNextEpisode(episodes, 'tap-1')?.slug, 'tap-2');
  assert.equal(resolveSequentialNextEpisode(episodes, 'tap-2')?.slug, 'tap-3');
  assert.equal(resolveSequentialNextEpisode(episodes, 'tap-3'), null);
  assert.equal(resolveSequentialNextEpisode(episodes, 'missing'), null);
});

test('canAutoPlayNextEpisode enforces series type, next episode existence, toggle, and mode', () => {
  const episodes = [makeEpisode(1), makeEpisode(2)];

  const ok = canAutoPlayNextEpisode({
    movieType: 'series',
    episodes,
    currentEpisodeSlug: 'tap-1',
    autoPlayEnabled: true,
    playerMode: 'hls',
  });
  assert.equal(ok.eligible, true);
  assert.equal(ok.isSeries, true);
  assert.equal(ok.nextEpisode?.slug, 'tap-2');

  const disabled = canAutoPlayNextEpisode({
    movieType: 'series',
    episodes,
    currentEpisodeSlug: 'tap-1',
    autoPlayEnabled: false,
    playerMode: 'hls',
  });
  assert.equal(disabled.eligible, false);
  assert.equal(disabled.reason, 'disabled');

  const last = canAutoPlayNextEpisode({
    movieType: 'series',
    episodes,
    currentEpisodeSlug: 'tap-2',
    autoPlayEnabled: true,
    playerMode: 'hls',
  });
  assert.equal(last.eligible, false);
  assert.equal(last.reason, 'last-episode');

  const singleFilm = canAutoPlayNextEpisode({
    movieType: 'single',
    episodes,
    currentEpisodeSlug: 'tap-1',
    autoPlayEnabled: true,
    playerMode: 'hls',
  });
  assert.equal(singleFilm.eligible, false);
  assert.equal(singleFilm.reason, 'not-series');

  const trailer = canAutoPlayNextEpisode({
    movieType: 'series',
    episodes,
    currentEpisodeSlug: 'tap-1',
    autoPlayEnabled: true,
    playerMode: 'trailer',
  });
  assert.equal(trailer.eligible, false);
  assert.equal(trailer.reason, 'trailer');
});

test('computeCountdownProgress calculates accurate elapsed percentage for 10s countdown', () => {
  assert.equal(AUTO_PLAY_COUNTDOWN_SECONDS, 10);
  assert.equal(computeCountdownProgress(10), 0);
  assert.equal(computeCountdownProgress(5), 50);
  assert.equal(computeCountdownProgress(0), 100);
  assert.equal(computeCountdownProgress(-2), 100);
});

test('appendYoutubeJsApiParams attaches enablejsapi cleanly only to YouTube embed URLs', () => {
  const yt = appendYoutubeJsApiParams(
    'https://www.youtube.com/embed/abc12345?autoplay=1&rel=0',
    'http://localhost:3000'
  );
  const parsed = new URL(yt);
  assert.equal(parsed.searchParams.get('enablejsapi'), '1');
  assert.equal(parsed.searchParams.get('origin'), 'http://localhost:3000');

  const other = 'https://player.phimapi.com/embed/123';
  assert.equal(appendYoutubeJsApiParams(other, 'http://localhost:3000'), other);
});

test('isYoutubeEndedPostMessage detects playerState 0 from YouTube origins only', () => {
  assert.equal(
    isYoutubeEndedPostMessage(
      JSON.stringify({ event: 'infoDelivery', info: { playerState: 0 } }),
      'https://www.youtube.com'
    ),
    true
  );
  assert.equal(
    isYoutubeEndedPostMessage(
      JSON.stringify({ event: 'onStateChange', info: 0 }),
      'https://www.youtube-nocookie.com'
    ),
    true
  );
  assert.equal(
    isYoutubeEndedPostMessage(
      JSON.stringify({ event: 'infoDelivery', info: { playerState: 1 } }),
      'https://www.youtube.com'
    ),
    false
  );
  assert.equal(
    isYoutubeEndedPostMessage(
      JSON.stringify({ event: 'infoDelivery', info: { playerState: 0 } }),
      'https://evil.example.com'
    ),
    false
  );
});
