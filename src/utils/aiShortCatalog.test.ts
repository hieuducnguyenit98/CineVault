import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAiShortCatalogResponse,
  buildYoutubeAiDetail,
  classifyAiShortGenres,
  extractAiSeriesMeta,
  findGroupedSeriesForVideoId,
  getAiShortGenreQueries,
  groupAiShortSeries,
  isAuthenticChineseAiFilm,
  parseVietnameseCount,
  parseYouTubeChannelBrowse,
  parseYouTubeInnerTubeSearch,
  parseYouTubeRssXml,
  parseYoutubeDurationClock,
  type AiShortSourceRecord,
} from './aiShortCatalog';

test('parseYoutubeDurationClock parses mm:ss and hh:mm:ss durations cleanly', () => {
  assert.equal(parseYoutubeDurationClock('8:15'), 495);
  assert.equal(parseYoutubeDurationClock('1:35:02'), 5702);
  assert.equal(parseYoutubeDurationClock('invalid'), null);
});

test('parseVietnameseCount handles Vietnamese and English shorthand counts', () => {
  assert.equal(parseVietnameseCount('5 lượt xem'), 5);
  assert.equal(parseVietnameseCount('12 N lượt xem'), 12000);
  assert.equal(parseVietnameseCount('1,5 Tr lượt xem'), 1500000);
  assert.equal(parseVietnameseCount('45.000 lượt xem'), 45000);
});

test('isAuthenticChineseAiFilm keeps real AI short films and rejects tutorials/non-AI', () => {
  const validVi: AiShortSourceRecord = {
    videoId: '24vh9FTj0yQ',
    title: 'PHẦN 1 - NƠI CON TIM RUNG ĐỘNG | Phim AI Vietsub | Full HD',
    description: 'Phim ngắn AI Trung Quốc ngôn tình học đường',
    channelId: 'UC0wCAXJ-MyCXWWL1l0XZomQ',
    channelName: 'Phim AI Vietsub',
    publishedAt: '2026-11-18',
    durationText: '28:10',
    durationSeconds: 1690,
    views: 15000,
    thumbnailUrl: 'https://i.ytimg.com/vi/24vh9FTj0yQ/mqdefault.jpg',
    isVietnameseHint: true,
    isPureAiChannel: true,
  };

  const validCn: AiShortSourceRecord = {
    videoId: 'flc4XLsxO4E',
    title: '一口气看完 AI悬疑惊悚短剧《大盲区事件》',
    description: '#AI短剧 #悬疑',
    channelId: 'UC4mw58YlaHDs7p2HDCtzDGw',
    channelName: 'Aimaomao',
    publishedAt: '2026-11-10',
    durationText: '14:20',
    durationSeconds: 860,
    views: 80000,
    thumbnailUrl: 'https://i.ytimg.com/vi/flc4XLsxO4E/mqdefault.jpg',
    isPureAiChannel: false,
  };

  const tutorialNoise: AiShortSourceRecord = {
    videoId: 'ulpdVurhuCg',
    title: 'Hướng Dẫn Làm Phim Bằng AI Chất Lượng Cao (Từng bước)',
    description: 'Chia sẻ prompt và workflow tạo video AI',
    channelId: 'UC_random_tutorial',
    channelName: 'Học AI',
    publishedAt: '2026-10-01',
    durationText: '21:01',
    durationSeconds: 1261,
    views: 50000,
    thumbnailUrl: 'https://i.ytimg.com/vi/ulpdVurhuCg/mqdefault.jpg',
  };

  const pronounAiNoise: AiShortSourceRecord = {
    videoId: 'abc12345678',
    title: 'Trùng sinh trả thù khiến ai cũng hối hận | Phim Ngôn Tình Cổ Trang',
    description: 'Phim người thật đóng review',
    channelId: 'UC_regular_drama',
    channelName: 'Trạm Cổ Trang',
    publishedAt: '2026-11-01',
    durationText: '2:14:38',
    durationSeconds: 8078,
    views: 120000,
    thumbnailUrl: 'https://i.ytimg.com/vi/abc12345678/mqdefault.jpg',
  };

  assert.equal(isAuthenticChineseAiFilm(validVi), true);
  assert.equal(isAuthenticChineseAiFilm(validCn), true);
  assert.equal(isAuthenticChineseAiFilm(tutorialNoise), false);
  assert.equal(isAuthenticChineseAiFilm(pronounAiNoise), false);
});

test('parseYouTubeRssXml, parseYouTubeChannelBrowse, and parseYouTubeInnerTubeSearch extract structured records', () => {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
  <feed>
    <entry>
      <yt:videoId>6gufRvP7sNE</yt:videoId>
      <title>TẬP 10 Ác Ý Đẹp Đẽ | VIETSUB — Phim AI &amp; Học Đường</title>
      <author><name>Phim AI Vietsub</name></author>
      <published>2026-11-19T04:49:01+00:00</published>
      <media:group>
        <media:description>Phim ngắn AI Trung Quốc lấy bối cảnh học đường #PhimAI</media:description>
        <media:community><media:statistics views="3460"/></media:community>
      </media:group>
    </entry>
  </feed>`;

  const rssItems = parseYouTubeRssXml(xml, {
    channelId: 'UC0wCAXJ-MyCXWWL1l0XZomQ',
    channelName: 'Phim AI Vietsub',
    isVietnamese: true,
    isPureAi: true,
  });
  assert.equal(rssItems.length, 1);
  assert.equal(rssItems[0].videoId, '6gufRvP7sNE');
  assert.equal(rssItems[0].views, 3460);
  assert.ok(rssItems[0].title.includes('&'));

  const browseJson = {
    contents: {
      twoColumnBrowseResultsRenderer: {
        tabs: [
          { tabRenderer: { selected: false } },
          {
            tabRenderer: {
              selected: true,
              content: {
                richGridRenderer: {
                  contents: [
                    {
                      richItemRenderer: {
                        content: {
                          lockupViewModel: {
                            contentId: 'f7VpgtRIr0w',
                            metadata: {
                              lockupMetadataViewModel: {
                                title: { content: 'PHẦN 1 - NƠI CON TIM RUNG ĐỘNG | Phim AI Vietsub' },
                                metadata: {
                                  contentMetadataViewModel: {
                                    metadataRows: [
                                      {
                                        metadataParts: [
                                          { text: { content: '15 N lượt xem' } },
                                          { text: { content: '2 ngày trước' } },
                                        ],
                                      },
                                    ],
                                  },
                                },
                              },
                            },
                            contentImage: {
                              thumbnailViewModel: {
                                overlays: [
                                  {
                                    thumbnailBottomOverlayViewModel: {
                                      badges: [{ thumbnailBadgeViewModel: { text: '24:49' } }],
                                    },
                                  },
                                ],
                              },
                            },
                          },
                        },
                      },
                    },
                    {
                      continuationItemRenderer: {
                        continuationEndpoint: {
                          continuationCommand: { token: 'NEXT_TOKEN_123' },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
        ],
      },
    },
  };

  const browseParsed = parseYouTubeChannelBrowse(browseJson, {
    channelId: 'UC0wCAXJ-MyCXWWL1l0XZomQ',
    channelName: 'Phim AI Vietsub',
    isVietnamese: true,
    isPureAi: true,
  });
  assert.equal(browseParsed.records.length, 1);
  assert.equal(browseParsed.records[0].videoId, 'f7VpgtRIr0w');
  assert.equal(browseParsed.records[0].durationSeconds, 1489);
  assert.equal(browseParsed.records[0].views, 15000);
  assert.equal(browseParsed.continuationToken, 'NEXT_TOKEN_123');

  const innerTube = {
    contents: {
      twoColumnSearchResultsRenderer: {
        primaryContents: {
          sectionListRenderer: {
            contents: [
              {
                itemSectionRenderer: {
                  contents: [
                    {
                      videoRenderer: {
                        videoId: 'XxJlkzsmeQA',
                        title: { runs: [{ text: '【AI漫剧全集】《新婚夜流放》古装穿越' }] },
                        ownerText: {
                          runs: [
                            {
                              text: 'KK爱看',
                              navigationEndpoint: {
                                browseEndpoint: { browseId: 'UCbM7SQSOEpla-sDOkpdNouQ' },
                              },
                            },
                          ],
                        },
                        lengthText: { simpleText: '2:23:04' },
                        viewCountText: { simpleText: '45.000 lượt xem' },
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
      },
    },
  };

  const ytItems = parseYouTubeInnerTubeSearch(innerTube, 'co-trang');
  assert.equal(ytItems.length, 1);
  assert.equal(ytItems[0].durationSeconds, 8584);
  assert.equal(ytItems[0].queriedGenreSlug, 'co-trang');
});

test('extractAiSeriesMeta and groupAiShortSeries group multi-part Vietnamese and Chinese AI films accurately', () => {
  const m1 = extractAiSeriesMeta(
    'PHẦN 1 - NƠI CON TIM RUNG ĐỘNG | Phim AI Vietsub | Full HD',
    'Phim AI Vietsub'
  );
  const m2 = extractAiSeriesMeta(
    'PHẦN 2 - NƠI CON TIM RUNG ĐỘNG | Phim AI Vietsub | Full HD',
    'Phim AI Vietsub'
  );
  assert.equal(m1.seriesKey, m2.seriesKey);
  assert.equal(m1.partLabel, 'Phần 1');
  assert.equal(m2.partLabel, 'Phần 2');
  assert.ok(m1.partOrder < m2.partOrder);

  const cn1 = extractAiSeriesMeta('【AI漫剧全集】《梦境预知未来第一季》第1~100集#KK爱看');
  const cn2 = extractAiSeriesMeta('【AI漫剧全集】《梦境预知未来第二季》第1~120集#KK爱看');
  assert.equal(cn1.seriesKey, cn2.seriesKey);
  assert.ok(cn1.partOrder < cn2.partOrder);

  const sampleRecords: AiShortSourceRecord[] = [
    {
      videoId: 'vid_p2_aaaaa',
      title: '[ Phim AI ] Thảm Án Trường Đại Học Phần 2 | 3D AI Vietsub',
      description: 'Kinh dị AI',
      channelId: 'UCS1AX1qKgPaRkha3nkGwt0g',
      channelName: 'Yuris Vietsub',
      publishedAt: '2026-11-18',
      durationText: '18:20',
      durationSeconds: 1100,
      views: 18000,
      thumbnailUrl: 'https://i.ytimg.com/vi/vid_p2_aaaaa/mqdefault.jpg',
      isVietnameseHint: true,
      isPureAiChannel: true,
    },
    {
      videoId: 'vid_p1_aaaaa',
      title: '[ Phim AI ] Thảm Án Trường Đại Học Phần 1 | 3D AI Vietsub',
      description: 'Kinh dị AI',
      channelId: 'UCS1AX1qKgPaRkha3nkGwt0g',
      channelName: 'Yuris Vietsub',
      publishedAt: '2026-11-16',
      durationText: '15:10',
      durationSeconds: 910,
      views: 25000,
      thumbnailUrl: 'https://i.ytimg.com/vi/vid_p1_aaaaa/mqdefault.jpg',
      isVietnameseHint: true,
      isPureAiChannel: true,
    },
    {
      videoId: 'vid_other_zz',
      title: 'Chê Thịt Anh Quá Rẻ | AI Drama Vietsub',
      description: 'Phim AI cổ trang',
      channelId: 'UCUQ8TWZ7bioQQ03dywVaZ6g',
      channelName: 'AI Drama',
      publishedAt: '2026-11-15',
      durationText: '42:00',
      durationSeconds: 2520,
      views: 50000,
      thumbnailUrl: 'https://i.ytimg.com/vi/vid_other_zz/mqdefault.jpg',
      isVietnameseHint: true,
      isPureAiChannel: true,
    },
  ];

  const grouped = groupAiShortSeries(sampleRecords);
  assert.equal(grouped.length, 2);

  const uniGroup = findGroupedSeriesForVideoId('vid_p1_aaaaa', sampleRecords);
  assert.ok(uniGroup);
  assert.equal(uniGroup.parts.length, 2);
  assert.equal(uniGroup.parts[0].videoId, 'vid_p1_aaaaa');
  assert.equal(uniGroup.parts[0].partLabel, 'Phần 1');
  assert.equal(uniGroup.parts[1].videoId, 'vid_p2_aaaaa');
  assert.equal(uniGroup.parts[1].partLabel, 'Phần 2');

  const detail = buildYoutubeAiDetail(uniGroup);
  assert.equal(detail.episodeTotal, 2);
  assert.equal(detail.servers[0].episodes.length, 2);
  assert.equal(detail.servers[0].episodes[0].name, 'Phần 1');
  assert.equal(detail.servers[0].episodes[1].name, 'Phần 2');
  assert.ok(detail.servers[0].episodes[1].linkEmbed.includes('vid_p2_aaaaa'));

  const seriesOnlyCatalog = buildAiShortCatalogResponse(sampleRecords, {
    format: 'series',
  });
  assert.equal(seriesOnlyCatalog.items.length, 1);
  assert.equal(seriesOnlyCatalog.items[0].groupParts?.length, 2);
  assert.equal(seriesOnlyCatalog.totalSourceVideos, 3);
  assert.equal(seriesOnlyCatalog.groupedSeriesCount, 1);

  // Regression: "TẬP 10" must NEVER match \bp 10 -> Phần 10, and 10.1 / 10.2 must group cleanly
  const ep10 = extractAiSeriesMeta('TẬP 10 Ác Ý Đẹp Đẽ | VIETSUB');
  const ep10_1 = extractAiSeriesMeta('TẬP 10.1 Ác Ý Đẹp Đẽ | VIETSUB');
  const ep10_2 = extractAiSeriesMeta('TẬP 10.2 Ác Ý Đẹp Đẽ | VIETSUB');
  assert.equal(ep10.partLabel, 'Tập 10');
  assert.equal(ep10_1.partLabel, 'Tập 10.1');
  assert.equal(ep10_2.partLabel, 'Tập 10.2');
  assert.equal(ep10.seriesTitle, 'Ác Ý Đẹp Đẽ');
  assert.equal(ep10.seriesKey, ep10_1.seriesKey);
  assert.equal(ep10_1.seriesKey, ep10_2.seriesKey);
  assert.ok(ep10.partOrder < ep10_1.partOrder && ep10_1.partOrder < ep10_2.partOrder);

  // Regression: emojis & bracketed parts like 🎬[PHẦN 5] must leave clean title
  const dragon1 = extractAiSeriesMeta('🎬[PHẦN 1] LONG TRANH GIANG HỒ | Phim AI Vietsub');
  const dragon5 = extractAiSeriesMeta('🎬[PHẦN 5] LONG TRANH GIANG HỒ | Phim AI Vietsub');
  assert.equal(dragon1.seriesTitle, 'LONG TRANH GIANG HỒ');
  assert.equal(dragon5.seriesTitle, 'LONG TRANH GIANG HỒ');
  assert.equal(dragon1.seriesKey, dragon5.seriesKey);

  // Regression: 《EP 10》 without CJK characters must be parsed as Episode 10, NOT as a CJK book title
  const blEp10 = extractAiSeriesMeta('[VIET/ENG SUB] Lưu Luyến Khôn Nguôi | PHIM BL AI 《EP 10》');
  assert.equal(blEp10.partLabel, 'Tập 10');
  assert.equal(blEp10.seriesTitle, 'Lưu Luyến Khôn Nguôi');

  // Regression: Generic genre/sub/episode segments must NEVER mega-group unrelated films
  const unrelatedRecords: AiShortSourceRecord[] = [
    {
      videoId: 'bl_vid_0001',
      title: 'BL VIETSUB | Nụ Hôn Mùa Hạ | EP1-EP2',
      description: 'Phim AI đam mỹ',
      channelId: 'UCjIjEOXD6OEKARrWBVHsrnw',
      channelName: 'An Kỳ',
      publishedAt: '2026-11-10',
      durationText: '12:00',
      durationSeconds: 720,
      views: 5000,
      thumbnailUrl: 'https://i.ytimg.com/vi/bl_vid_0001/mqdefault.jpg',
      isVietnameseHint: true,
      isPureAiChannel: true,
    },
    {
      videoId: 'bl_vid_0002',
      title: 'Đam Mỹ Vietsub | Bí Mật Đêm Mưa | EP1-EP2',
      description: 'Phim AI đam mỹ',
      channelId: 'UCjIjEOXD6OEKARrWBVHsrnw',
      channelName: 'An Kỳ',
      publishedAt: '2026-11-11',
      durationText: '14:00',
      durationSeconds: 840,
      views: 6000,
      thumbnailUrl: 'https://i.ytimg.com/vi/bl_vid_0002/mqdefault.jpg',
      isVietnameseHint: true,
      isPureAiChannel: true,
    },
    {
      videoId: 'bl_vid_0003',
      title: 'BL VIETSUB | Phim hoạt hình đam mỹ hay',
      description: 'Phim AI đam mỹ',
      channelId: 'UCjIjEOXD6OEKARrWBVHsrnw',
      channelName: 'An Kỳ',
      publishedAt: '2026-11-12',
      durationText: '11:00',
      durationSeconds: 660,
      views: 7000,
      thumbnailUrl: 'https://i.ytimg.com/vi/bl_vid_0003/mqdefault.jpg',
      isVietnameseHint: true,
      isPureAiChannel: true,
    },
  ];
  const unrelatedGrouped = groupAiShortSeries(unrelatedRecords);
  assert.equal(unrelatedGrouped.length, 3);
  assert.ok(unrelatedGrouped.every((g) => g.parts.length === 1));
});

test('classifyAiShortGenres, getAiShortGenreQueries, and buildAiShortCatalogResponse work cleanly', () => {
  assert.ok(getAiShortGenreQueries('').length >= 10);
  assert.ok(getAiShortGenreQueries('co-trang').length >= 2);
  assert.ok(getAiShortGenreQueries('kinh-di').length >= 2);

  const records: AiShortSourceRecord[] = [
    {
      videoId: '6gufRvP7sNE',
      title: 'TẬP 10 Ác Ý Đẹp Đẽ | VIETSUB Phim AI Học Đường',
      description: 'Phim ngắn AI Trung Quốc bối cảnh học đường',
      channelId: 'UC0wCAXJ-MyCXWWL1l0XZomQ',
      channelName: 'Phim AI Vietsub',
      publishedAt: '2026-11-19',
      durationText: '12:30',
      durationSeconds: 750,
      views: 18000,
      thumbnailUrl: 'https://i.ytimg.com/vi/6gufRvP7sNE/mqdefault.jpg',
      isVietnameseHint: true,
      isPureAiChannel: true,
    },
    {
      videoId: 'XxJlkzsmeQA',
      title: '【AI漫剧全集】新婚夜流放 古装穿越 第1~112集',
      description: '#AI短剧 #古装',
      channelId: 'UCbM7SQSOEpla-sDOkpdNouQ',
      channelName: 'KK爱看',
      publishedAt: '2026-11-15',
      durationText: '2:23:04',
      durationSeconds: 8584,
      views: 92000,
      thumbnailUrl: 'https://i.ytimg.com/vi/XxJlkzsmeQA/mqdefault.jpg',
      isVietnameseHint: false,
      isPureAiChannel: true,
    },
  ];

  const genres = classifyAiShortGenres(records[0]);
  assert.ok(genres.some((g) => g.slug === 'hoc-duong'));

  const coTrangCatalog = buildAiShortCatalogResponse(records, {
    category: 'co-trang',
    format: 'all',
  });
  assert.equal(coTrangCatalog.items.length, 1);
  assert.equal(coTrangCatalog.items[0].slug, 'yt-ai--XxJlkzsmeQA');

  const viCatalog = buildAiShortCatalogResponse(records, {
    format: 'vi-sub',
  });
  assert.equal(viCatalog.items.length, 1);
  assert.equal(viCatalog.items[0].slug, 'yt-ai--6gufRvP7sNE');
});

