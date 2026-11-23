import type {
  CatalogResponse,
  EpisodeItem,
  MovieDetail,
  MovieGroupPart,
  MovieSummary,
  TaxonomyRef,
} from '../types/movie';

export type AiShortFormatFilter =
  | 'all'
  | 'series'
  | 'vi-sub'
  | 'ultra-short'
  | 'cn-raw';

export const YT_AI_SLUG_PREFIX = 'yt-ai--';

export interface AiShortChannelSpec {
  channelId: string;
  name: string;
  isVietnamese: boolean;
  isPureAi: boolean;
}

export const AI_SHORT_CHANNEL_FEEDS: AiShortChannelSpec[] = [
  // Vietnamese Vietsub & Dubbed Chinese AI Short Film channels
  { channelId: 'UC0wCAXJ-MyCXWWL1l0XZomQ', name: 'Phim AI Vietsub', isVietnamese: true, isPureAi: true },
  { channelId: 'UCWw04AdPsuaf59SSjQHTTnw', name: 'Sora Dub', isVietnamese: true, isPureAi: true },
  { channelId: 'UCUQ8TWZ7bioQQ03dywVaZ6g', name: 'AI Drama', isVietnamese: true, isPureAi: true },
  { channelId: 'UCC0_r8i8aEgwkdETozas9zQ', name: 'Yoon Vietsub', isVietnamese: true, isPureAi: true },
  { channelId: 'UC40M1CkROns2e_x2VQC4JJg', name: 'Yuan', isVietnamese: true, isPureAi: true },
  { channelId: 'UCjIjEOXD6OEKARrWBVHsrnw', name: 'An Kỳ', isVietnamese: true, isPureAi: true },
  { channelId: 'UCS1AX1qKgPaRkha3nkGwt0g', name: 'Yuris Vietsub', isVietnamese: true, isPureAi: true },
  { channelId: 'UCaJF3EewrPYPb1rHpSUKtDA', name: 'Phim Zoo AI', isVietnamese: true, isPureAi: true },
  { channelId: 'UC4xe4vHwdXL_4T2ecFhb62w', name: 'TPhạm AI', isVietnamese: true, isPureAi: true },
  { channelId: 'UCnMTOk0TmPP49n7HMoRe9-w', name: 'GodSub', isVietnamese: true, isPureAi: true },
  { channelId: 'UCdo_lT576_rLfpeOp1WkANw', name: 'Cáo Nhỏ review', isVietnamese: true, isPureAi: true },
  { channelId: 'UCHMetXI2mSf6pmrZh5MEZ1g', name: 'Sử Lạc Channel', isVietnamese: true, isPureAi: false },
  { channelId: 'UCoDbjVH_qTL7EvtEkTNpEzw', name: 'CibiiSub', isVietnamese: true, isPureAi: false },
  { channelId: 'UCN8LHEK4s40MgC1EWpRY23Q', name: 'Ngấm Vietsub', isVietnamese: true, isPureAi: false },
  { channelId: 'UCCeSE4i7OBa5kBGNHuHRN8A', name: 'Maka Sub', isVietnamese: true, isPureAi: false },
  { channelId: 'UCFb_f6OA5H9e0bLQPDwDVxw', name: 'Khoa Xuyên Không', isVietnamese: true, isPureAi: false },
  // Original Chinese AI Micro-Drama (AI短剧 / AI漫剧 / AIGC) channels
  { channelId: 'UCbM7SQSOEpla-sDOkpdNouQ', name: 'KK爱看', isVietnamese: false, isPureAi: true },
  { channelId: 'UC_GcrznCXn6b-i1Y7DOn54A', name: '盛世短剧', isVietnamese: false, isPureAi: true },
  { channelId: 'UCBhggMEAFdIAezRspo7KVCw', name: '一刻钟AI剧', isVietnamese: false, isPureAi: true },
  { channelId: 'UCQhDkoKOa17APEz0l53tH-w', name: '星河劇場', isVietnamese: false, isPureAi: true },
  { channelId: 'UCD9QPFWJtteLJUnjpky-Shg', name: 'AI漫剧社', isVietnamese: false, isPureAi: true },
  { channelId: 'UCtnH9XnSPj5e5iALMvsBgsw', name: '司司看好剧', isVietnamese: false, isPureAi: true },
  { channelId: 'UCM5-S9dVH1m6HaLTyBc7-BA', name: '桃夭劇場 TY Drama AI', isVietnamese: false, isPureAi: true },
  { channelId: 'UCUbOy6hRMrC-N7NZnE_OJtw', name: '墨影次元放映局', isVietnamese: false, isPureAi: true },
  { channelId: 'UCpB_pb38IRnXbA5AF0fDeZg', name: '浪漫剧场', isVietnamese: false, isPureAi: true },
  { channelId: 'UCMMb3szJb_fRT0JjhTORhqQ', name: '九界动漫 Nine Anime', isVietnamese: false, isPureAi: false },
  { channelId: 'UC_wzB3hfM3qQihd29EoK5dA', name: '魔法剧场', isVietnamese: false, isPureAi: false },
];

export const PURE_AI_CHANNEL_IDS = new Set(
  AI_SHORT_CHANNEL_FEEDS.filter((c) => c.isPureAi).map((c) => c.channelId)
);

export const VIETNAMESE_AI_CHANNEL_IDS = new Set(
  AI_SHORT_CHANNEL_FEEDS.filter((c) => c.isVietnamese).map((c) => c.channelId)
);

export interface AiShortSourceRecord {
  videoId: string;
  title: string;
  description: string;
  channelId: string;
  channelName: string;
  publishedAt: string;
  durationText: string;
  durationSeconds: number | null;
  views: number;
  thumbnailUrl: string;
  isVietnameseHint?: boolean;
  isPureAiChannel?: boolean;
  queriedGenreSlug?: string;
}

export interface AiSeriesMeta {
  seriesKey: string;
  seriesTitle: string;
  partLabel: string;
  partOrder: number;
  hasExplicitPart: boolean;
  isFullCompilation: boolean;
}

export interface GroupedAiSeries {
  seriesKey: string;
  seriesTitle: string;
  primary: AiShortSourceRecord;
  parts: Array<AiShortSourceRecord & { partLabel: string; partOrder: number; isFullCompilation: boolean }>;
  categories: TaxonomyRef[];
  score: number;
  totalViews: number;
  isVietnamese: boolean;
}

const GENRE_META_MAP: Record<string, { name: string; keywords: RegExp; queries: string[] }> = {
  'bi-an': {
    name: 'Bí Ẩn',
    keywords: /(bí ẩn|kỳ bí|huyền bí|trinh thám|quỷ dị|siêu nhiên|悬疑|诡异|灵异|推理|神秘)/i,
    queries: ['AI短剧 悬疑 诡异', 'phim ngắn AI bí ẩn vietsub', 'AI漫剧 悬疑 全集'],
  },
  'chien-tranh': {
    name: 'Chiến Tranh',
    keywords: /(chiến tranh|quân sự|chiến trường|cách mạng|đặc công|binh|战争|军旅|抗战|战场|特种兵)/i,
    queries: ['AI短剧 战争 军旅', 'AIGC 历史 战争', 'AI短剧 古代 战争'],
  },
  'chinh-kich': {
    name: 'Chính Kịch',
    keywords: /(chính kịch|báo thù|phản công|nghịch tập|hào môn|trả thù|复仇|逆袭|打脸|豪门|剧情)/i,
    queries: ['AI短剧 复仇 逆袭 全集', 'phim AI vietsub trả thù', 'AI漫剧 逆袭 完结'],
  },
  'co-trang': {
    name: 'Cổ Trang',
    keywords: /(cổ trang|cung đấu|hoàng đế|vương gia|công chúa|tiểu thư|triều đình|trạch đấu|phò mã|hoàng hậu|古装|宫斗|宅斗|王妃|皇上|世子|丞相|穿越)/i,
    queries: ['AI短剧 古装 宫斗 全集', 'phim ngắn AI cổ trang vietsub', 'AI真人剧 古装 穿越'],
  },
  'gia-dinh': {
    name: 'Gia Đình',
    keywords: /(gia đình|mẹ kế|con dâu|mẹ chồng|phu thê|bố mẹ|hôn nhân|con gái|con trai|家庭|伦理|父母|母女|婆婆|儿媳|婚姻)/i,
    queries: ['AI漫剧 家庭 伦理', 'AI短剧 亲情 家庭', 'phim AI gia đình vietsub'],
  },
  'hai-huoc': {
    name: 'Hài Hước',
    keywords: /(hài hước|hài|cười|bá đạo|tấu hài|lầy lội|trào phúng|搞笑|喜剧|沙雕|幽默|爆笑)/i,
    queries: ['AI短剧 搞笑 喜剧', 'AI漫剧 搞笑 沙雕', 'phim ngắn AI hài hước vietsub'],
  },
  'hanh-dong': {
    name: 'Hành Động',
    keywords: /(hành động|chiến thần|sát thủ|đặc chủng|truy sát|quyết chiến|đánh nhau|bạo lực|动作|特工|战神|杀手|复仇爽剧)/i,
    queries: ['AI短剧 动作 战神', 'phim ngắn AI hành động Trung Quốc', 'AI漫剧 战神 爽剧'],
  },
  'hinh-su': {
    name: 'Hình Sự',
    keywords: /(hình sự|cảnh sát|phá án|hắc đạo|tội phạm|vụ án|điều tra|ngục|刑侦|侦探|犯罪|悬案|破案|警匪|黑道)/i,
    queries: ['AI短剧 刑侦 犯罪 悬案', 'phim ngắn AI hắc đạo', 'AI悬疑 破案 短剧'],
  },
  'hoc-duong': {
    name: 'Học Đường',
    keywords: /(học đường|thanh xuân|đại học|trung học|học sinh|giảng đường|trường học|hoa khôi|nam thần|校园|青春|高校|校花|学霸|同学)/i,
    queries: ['AI短剧 校园 青春', 'phim AI học đường vietsub', 'AI漫剧 校园 校花'],
  },
  'khoa-hoc': {
    name: 'Khoa Học',
    keywords: /(khoa học|công nghệ|ai giác tỉnh|cơ giáp|robot|vũ trụ|phòng thí nghiệm|科技|机械|宇宙|未来|实验室|克隆)/i,
    queries: ['AIGC 科幻 未来 短片', 'AI短剧 科技 未来', 'AI漫剧 机甲 科技'],
  },
  'kinh-di': {
    name: 'Kinh Dị',
    keywords: /(kinh dị|ma|quỷ|zombie|xác sống|ác mộng|ám ảnh|kinh hoàng|rùng rợn|恐怖|惊悚|丧尸|鬼|纸钱|诡异|怪谈)/i,
    queries: ['AI短剧 恐怖 惊悚', 'AIGC 恐怖 微电影', 'phim ngắn AI kinh dị zombie vietsub'],
  },
  'kinh-dien': {
    name: 'Kinh Điển',
    keywords: /(kinh điển|danh tác|tây du ký|tam quốc|bạch xà|phong thần|经典|名著|西游|三国|白蛇|红楼)/i,
    queries: ['AIGC 名著 经典 短片', 'AI生成 白蛇 西游 短片'],
  },
  'lich-su': {
    name: 'Lịch Sử',
    keywords: /(lịch sử|triều đại|tần thủy hoàng|tam quốc|chiến quốc|lưu bị|quan vũ|历史|秦始皇|三国志|汉朝|唐朝|明朝|古代史)/i,
    queries: ['AIGC 历史 三国 AI短片', 'AI短剧 历史 帝王'],
  },
  'mien-tay': {
    name: 'Miền Tây',
    keywords: /(miền tây|hoang mạc|cao bồi|hoang dã|đảo hoang|sinh tồn|西部|荒野|求生|牛仔|大漠)/i,
    queries: ['AI短剧 荒野 求生', 'AIGC western short film'],
  },
  'phim-18': {
    name: 'Phim 18+',
    keywords: /(18\+|quyến rũ|đam mỹ|bách hợp|bl\b|gl\b|tổng tài|mập mờ|ngoại tình|cưỡng đoạt|chiếm hữu|dục|暧昧|虐恋|双男主|百合|纯爱|出轨|霸总)/i,
    queries: ['AI短剧 霸总 虐恋', 'phim AI vietsub đam mỹ bách hợp', 'AI Drama tổng tài vietsub'],
  },
  'phim-ngan': {
    name: 'Phim Ngắn',
    keywords: /(phim ngắn|short film|vi phim|truyện ngắn|aigc|短片|微电影|短剧|漫剧)/i,
    queries: ['phim ngắn AI Trung Quốc vietsub', 'AIGC 中国短片'],
  },
  'phieu-luu': {
    name: 'Phiêu Lưu',
    keywords: /(phiêu lưu|thám hiểm|đảo hoang|mạo hiểm|tầm bảo|đạo mộ|探险|盗墓|冒险|寻宝|秘境)/i,
    queries: ['AI短剧 探险 盗墓', 'AI漫剧 冒险 秘境'],
  },
  'than-thoai': {
    name: 'Thần Thoại',
    keywords: /(thần thoại|tu tiên|tiên hiệp|huyền huyễn|luyện đan|phi thăng|tông môn|thần thú|yêu ma|修仙|仙侠|玄幻|神话|封神|修真|灵气|妖)/i,
    queries: ['AI漫剧 修仙 仙侠 玄幻', 'phim tiên hiệp AI vietsub', 'AI短剧 玄幻 完结'],
  },
  'the-thao': {
    name: 'Thể Thao',
    keywords: /(thể thao|bóng rổ|bóng đá|nba|esports|thể dục|đua xe|quyền anh|体育|篮球|足球|电竞|赛车|拳击)/i,
    queries: ['AI短剧 体育 篮球 电竞', 'AI漫剧 竞技 篮球'],
  },
  'tre-em': {
    name: 'Trẻ Em',
    keywords: /(trẻ em|thiếu nhi|cổ tích|động vật|phép màu|bé gái|bé trai|儿童|童话|萌娃|亲子|奶爸)/i,
    queries: ['AI动画 儿童 萌娃', 'AI漫剧 萌娃 亲子'],
  },
  'tai-lieu': {
    name: 'Tài Liệu',
    keywords: /(tài liệu|khám phá|khoa học phổ thông|kỳ quan|văn hóa|纪录片|科普|奇观|文化|探索)/i,
    queries: ['AIGC 纪录片 科普 短片', 'AIGC 文化 历史 短片'],
  },
  'tam-ly': {
    name: 'Tâm Lý',
    keywords: /(tâm lý|nhân tính|cảm động|nội tâm|chữa lành|hối hận|phản bội|人性|心理|治愈|遗憾|救赎|伦理)/i,
    queries: ['AI短剧 人性 治愈 心理', 'phim ngắn AI tâm lý vietsub'],
  },
  'tinh-cam': {
    name: 'Tình Cảm',
    keywords: /(tình cảm|ngôn tình|ngọt sủng|yêu|tình yêu|cưới|hôn ước|thanh mai|thầm yêu|甜宠|恋爱|爱情|先婚后爱|暗恋|宠妻|情缘)/i,
    queries: ['AI漫剧 甜宠 恋爱 全集', 'phim AI ngôn tình vietsub', 'AI真人剧 甜宠 全集'],
  },
  'vien-tuong': {
    name: 'Viễn Tưởng',
    keywords: /(viễn tưởng|tận thế|mạt thế|xuyên không|trọng sinh|hệ thống|dị năng|hồi quy|末世|末日|重生|穿越|系统|异能|科幻)/i,
    queries: ['AI短剧 末世 科幻 异能', 'AI漫剧 重生 系统 穿越', 'phim AI tận thế zombie phần'],
  },
  'vo-thuat': {
    name: 'Võ Thuật',
    keywords: /(võ thuật|kiếm hiệp|võ công|giang hồ|võ đạo|kiếm đạo|tuyệt học|武侠|功夫|剑道|江湖|武道|宗师)/i,
    queries: ['AI短剧 武侠 功夫', 'AIGC 武侠 短片'],
  },
  'am-nhac': {
    name: 'Âm Nhạc',
    keywords: /(âm nhạc|ca hát|ca sĩ|nhạc|ca khúc|giai điệu|sân khấu|音乐|唱歌|歌手|歌曲|乐队|舞台)/i,
    queries: ['AI短剧 音乐 歌手', 'AI漫剧 唱歌 明星'],
  },
};

const REJECT_TUTORIAL_REGEX =
  /(hướng dẫn|cách làm|cách tạo|làm phim bằng ai|kiếm tiền|công cụ ai|prompt|workflow|tutorial|course|review phần mềm|so sánh kling|test kling|vtv24|bản tin|thời sự|tiêu điểm kinh tế|đào tạo|khóa học|ai làm video)/i;

const STRICT_AI_MARKER_REGEX =
  /(ai短剧|ai漫剧|ai剧|ai真人|ai动画|aigc|ai生成|ai自制|ai创作|ai制作|全\s*ai|ai悬疑|ai恐怖|ai科幻|ai武侠|ai微电影|ai短片|ai电影|ai原创|phim\s*(?:ngắn|hoạt hình|dài|bộ|cổ trang|tiên hiệp|hắc đạo|ngôn tình|bl|gl|tình cảm|kinh dị|tâm lý|zombie)?\s*ai\b|bằng\s*ai\b|3d\s*ai|zoo\s*ai|sora\s*dub|ai\s*drama|kling|seedance|vidu|hailuo|midjourney|#ai\b|#ai短剧|#ai漫剧|#aigc|#aidrama|《[^》]+》.*ai)/i;

export function decodeXmlEntities(input: string): string {
  return input
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)));
}

export function parseYoutubeDurationClock(text: unknown): number | null {
  if (typeof text !== 'string') return null;
  const trimmed = text.trim();
  if (!trimmed) return null;

  const clockMatch = trimmed.match(/^(\d+):(\d{1,2})(?::(\d{1,2}))?$/);
  if (clockMatch) {
    if (clockMatch[3] !== undefined) {
      const h = Number(clockMatch[1]);
      const m = Number(clockMatch[2]);
      const s = Number(clockMatch[3]);
      return h * 3600 + m * 60 + s;
    }
    const m = Number(clockMatch[1]);
    const s = Number(clockMatch[2]);
    return m * 60 + s;
  }
  return null;
}

export function parseVietnameseCount(text: unknown): number {
  if (typeof text !== 'string') return 0;
  const raw = text.trim().toLowerCase();
  if (!raw) return 0;
  const match = raw.match(/([\d.,]+)\s*(tr|triệu|m|million|n|nghìn|k|tỷ|t|b)?(?=\s|$)/u);
  if (!match) return 0;
  const numStr = match[1];
  const suffix = match[2] ?? '';
  let multiplier = 1;
  if (suffix === 'tr' || suffix === 'triệu' || suffix === 'm' || suffix === 'million') {
    multiplier = 1_000_000;
  } else if (suffix === 'n' || suffix === 'nghìn' || suffix === 'k') {
    multiplier = 1_000;
  } else if (suffix === 't' || suffix === 'tỷ' || suffix === 'b') {
    multiplier = 1_000_000_000;
  }

  if (multiplier > 1) {
    const val = Number(numStr.replace(',', '.'));
    return Number.isFinite(val) ? Math.round(val * multiplier) : 0;
  }
  const digits = numStr.replace(/[^\d]/g, '');
  return digits ? Number(digits) : 0;
}

export function parseEpisodeMinutes(timeText: unknown): number | null {
  if (typeof timeText !== 'string') return null;
  const clockSec = parseYoutubeDurationClock(timeText);
  if (clockSec !== null && clockSec > 0) {
    return Number((clockSec / 60).toFixed(2));
  }

  const normalized = timeText.trim().toLowerCase();
  if (!normalized) return null;

  const secMatch = normalized.match(/(\d+(?:[.,]\d+)?)\s*(?:giây|s\b)/i);
  if (secMatch && !normalized.includes('phút')) {
    const seconds = Number(secMatch[1].replace(',', '.'));
    if (Number.isFinite(seconds) && seconds > 0) {
      return Number((seconds / 60).toFixed(2));
    }
  }

  const minMatch = normalized.match(/(\d+(?:[.,]\d+)?)\s*(?:phút|p\b|min)/i);
  if (minMatch) {
    const mins = Number(minMatch[1].replace(',', '.'));
    if (Number.isFinite(mins) && mins > 0) {
      return mins;
    }
  }

  const hourMatch = normalized.match(/(\d+(?:[.,]\d+)?)\s*(?:giờ|h\b)/i);
  if (hourMatch) {
    const hours = Number(hourMatch[1].replace(',', '.'));
    if (Number.isFinite(hours) && hours > 0) {
      return hours * 60;
    }
  }

  return null;
}

export function formatVideoDurationLabel(seconds: number | null, fallbackText = ''): string {
  if (typeof seconds === 'number' && Number.isFinite(seconds) && seconds > 0) {
    const mins = Math.round(seconds / 60);
    if (mins < 1) return `${Math.max(1, Math.round(seconds))} giây`;
    if (mins < 60) return `${mins} phút`;
    const h = Math.floor(mins / 60);
    const rem = mins % 60;
    return rem > 0 ? `${h}h${String(rem).padStart(2, '0')}p` : `${h} giờ`;
  }
  return fallbackText || 'AI Short';
}

export function getAiShortGenreQueries(genreSlug: string): string[] {
  const clean = genreSlug.trim();
  if (!clean) {
    return [
      'phim ngắn AI Trung Quốc vietsub',
      'phim ngắn AI phần 1 phần 2 vietsub',
      'phim AI thuyết minh full tập',
      'AI短剧 全集 合集',
      'AI漫剧 全集 2026',
      'AI漫剧 第一季 第二季',
      'AIGC 中国短片',
      'Sora Dub phim AI vietsub',
      'AI Drama full vietsub',
      'AI悬疑 恐怖 短剧',
      'AI古装 穿越 短剧',
      'AI修仙 玄幻 漫剧',
    ];
  }
  const meta = GENRE_META_MAP[clean];
  if (meta) return meta.queries;
  return [`AI短剧 ${clean}`, `phim ngắn AI ${clean}`];
}

export function parseYouTubeRssXml(
  xml: string,
  meta: {
    channelId: string;
    channelName: string;
    isVietnamese: boolean;
    isPureAi: boolean;
  }
): AiShortSourceRecord[] {
  if (!xml || typeof xml !== 'string') return [];
  const entries = xml.match(/<entry>[\s\S]*?<\/entry>/g) ?? [];
  const records: AiShortSourceRecord[] = [];

  for (const entry of entries) {
    const videoId = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1]?.trim() ?? '';
    if (!videoId || !/^[A-Za-z0-9_-]{6,20}$/.test(videoId)) continue;

    const rawTitle = entry.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? '';
    const title = decodeXmlEntities(rawTitle).trim();
    if (!title) continue;

    const rawDesc = entry.match(/<media:description>([\s\S]*?)<\/media:description>/)?.[1] ?? '';
    const description = decodeXmlEntities(rawDesc).trim();
    const publishedAt = entry.match(/<published>([^<]+)<\/published>/)?.[1]?.trim() ?? '';
    const viewsRaw = entry.match(/<media:statistics[^>]*views="(\d+)"/)?.[1] ?? '0';
    const views = Number(viewsRaw) || 0;
    const authorName =
      decodeXmlEntities(entry.match(/<author>\s*<name>([\s\S]*?)<\/name>/)?.[1] ?? '').trim() ||
      meta.channelName;

    records.push({
      videoId,
      title,
      description,
      channelId: meta.channelId,
      channelName: authorName,
      publishedAt,
      durationText: '',
      durationSeconds: null,
      views,
      thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
      isVietnameseHint: meta.isVietnamese,
      isPureAiChannel: meta.isPureAi,
    });
  }

  return records;
}

function extractBrowseItem(
  item: Record<string, unknown>,
  meta: {
    channelId: string;
    channelName: string;
    isVietnamese: boolean;
    isPureAi: boolean;
  }
): AiShortSourceRecord | null {
  const richContent = (item.richItemRenderer as Record<string, unknown> | undefined)?.content as
    | Record<string, unknown>
    | undefined;
  const target = richContent ?? item;

  const lockup = target.lockupViewModel as Record<string, unknown> | undefined;
  if (lockup) {
    const videoId = typeof lockup.contentId === 'string' ? lockup.contentId.trim() : '';
    if (!videoId || !/^[A-Za-z0-9_-]{6,20}$/.test(videoId)) return null;

    const lMeta = (lockup.metadata as Record<string, unknown> | undefined)
      ?.lockupMetadataViewModel as Record<string, unknown> | undefined;
    const title = String(
      (lMeta?.title as Record<string, unknown> | undefined)?.content ?? ''
    ).trim();
    if (!title) return null;

    const rows =
      (
        (lMeta?.metadata as Record<string, unknown> | undefined)
          ?.contentMetadataViewModel as Record<string, unknown> | undefined
      )?.metadataRows;
    let viewText = '';
    let publishedAt = '';
    if (Array.isArray(rows)) {
      for (const row of rows) {
        const parts = (row as Record<string, unknown>)?.metadataParts;
        if (!Array.isArray(parts)) continue;
        for (const p of parts) {
          const content = String(
            ((p as Record<string, unknown>)?.text as Record<string, unknown> | undefined)
              ?.content ?? ''
          ).trim();
          if (!content) continue;
          if (/lượt xem|view|观看|次/i.test(content)) {
            viewText = content;
          } else if (/trước|ago|前|hour|day|week|month|year|giờ|ngày|tuần|tháng|năm/i.test(content)) {
            publishedAt = content;
          }
        }
      }
    }

    const overlays = (
      (lockup.contentImage as Record<string, unknown> | undefined)
        ?.thumbnailViewModel as Record<string, unknown> | undefined
    )?.overlays;
    let durationText = '';
    if (Array.isArray(overlays)) {
      for (const ov of overlays) {
        if (!ov || typeof ov !== 'object') continue;
        const ovObj = ov as Record<string, unknown>;
        const bottomBadges = (ovObj.thumbnailBottomOverlayViewModel as Record<string, unknown> | undefined)
          ?.badges;
        const overlayBadges = (ovObj.thumbnailOverlayBadgeViewModel as Record<string, unknown> | undefined)
          ?.thumbnailBadges;
        const badgeArr = Array.isArray(bottomBadges)
          ? bottomBadges
          : Array.isArray(overlayBadges)
          ? overlayBadges
          : [];
        for (const b of badgeArr) {
          const text = String(
            ((b as Record<string, unknown>)?.thumbnailBadgeViewModel as Record<string, unknown> | undefined)
              ?.text ?? ''
          ).trim();
          if (parseYoutubeDurationClock(text) !== null) {
            durationText = text;
            break;
          }
        }
        if (durationText) break;
      }
    }

    return {
      videoId,
      title,
      description: '',
      channelId: meta.channelId,
      channelName: meta.channelName,
      publishedAt,
      durationText,
      durationSeconds: parseYoutubeDurationClock(durationText),
      views: parseVietnameseCount(viewText),
      thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
      isVietnameseHint: meta.isVietnamese,
      isPureAiChannel: meta.isPureAi,
    };
  }

  const v = target.videoRenderer as Record<string, unknown> | undefined;
  if (v) {
    const videoId = typeof v.videoId === 'string' ? v.videoId.trim() : '';
    if (!videoId || !/^[A-Za-z0-9_-]{6,20}$/.test(videoId)) return null;
    const titleRuns = (v.title as Record<string, unknown> | undefined)?.runs;
    const title = Array.isArray(titleRuns)
      ? titleRuns
          .map((r) => (r && typeof r === 'object' ? String((r as Record<string, unknown>).text ?? '') : ''))
          .join('')
          .trim()
      : String((v.title as Record<string, unknown> | undefined)?.simpleText ?? '').trim();
    if (!title) return null;

    const durationText = String(
      (v.lengthText as Record<string, unknown> | undefined)?.simpleText ?? ''
    ).trim();
    const viewText = String(
      (v.viewCountText as Record<string, unknown> | undefined)?.simpleText ?? ''
    );
    const publishedAt = String(
      (v.publishedTimeText as Record<string, unknown> | undefined)?.simpleText ?? ''
    ).trim();

    return {
      videoId,
      title,
      description: '',
      channelId: meta.channelId,
      channelName: meta.channelName,
      publishedAt,
      durationText,
      durationSeconds: parseYoutubeDurationClock(durationText),
      views: parseVietnameseCount(viewText),
      thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
      isVietnameseHint: meta.isVietnamese,
      isPureAiChannel: meta.isPureAi,
    };
  }

  return null;
}

export function parseYouTubeChannelBrowse(
  json: unknown,
  meta: {
    channelId: string;
    channelName: string;
    isVietnamese: boolean;
    isPureAi: boolean;
  }
): { records: AiShortSourceRecord[]; continuationToken: string | null } {
  if (!json || typeof json !== 'object') {
    return { records: [], continuationToken: null };
  }
  const root = json as Record<string, unknown>;
  const itemsList: unknown[] = [];

  // Initial richGridRenderer response
  const tabs = (
    (root.contents as Record<string, unknown> | undefined)
      ?.twoColumnBrowseResultsRenderer as Record<string, unknown> | undefined
  )?.tabs;
  if (Array.isArray(tabs)) {
    const selectedTab =
      tabs.find((t) => (t as Record<string, unknown>)?.tabRenderer && ((t as Record<string, unknown>).tabRenderer as Record<string, unknown>).selected) ??
      tabs[1] ??
      tabs[0];
    const gridContents = (
      (
        (selectedTab as Record<string, unknown> | undefined)
          ?.tabRenderer as Record<string, unknown> | undefined
      )?.content as Record<string, unknown> | undefined
    )?.richGridRenderer as Record<string, unknown> | undefined;
    if (Array.isArray(gridContents?.contents)) {
      itemsList.push(...gridContents.contents);
    }
  }

  // Continuation appendContinuationItemsAction response
  const actions = Array.isArray(root.onResponseReceivedActions)
    ? root.onResponseReceivedActions
    : [];
  for (const act of actions) {
    const contItems = (
      (act as Record<string, unknown>)?.appendContinuationItemsAction as Record<string, unknown> | undefined
    )?.continuationItems;
    if (Array.isArray(contItems)) {
      itemsList.push(...contItems);
    }
  }

  const records: AiShortSourceRecord[] = [];
  let continuationToken: string | null = null;

  for (const rawItem of itemsList) {
    if (!rawItem || typeof rawItem !== 'object') continue;
    const obj = rawItem as Record<string, unknown>;
    const contRenderer = obj.continuationItemRenderer as Record<string, unknown> | undefined;
    if (contRenderer) {
      const token = (
        (contRenderer.continuationEndpoint as Record<string, unknown> | undefined)
          ?.continuationCommand as Record<string, unknown> | undefined
      )?.token;
      if (typeof token === 'string' && token) {
        continuationToken = token;
      }
      continue;
    }

    const parsed = extractBrowseItem(obj, meta);
    if (parsed) records.push(parsed);
  }

  return { records, continuationToken };
}

export function parseYouTubeInnerTubeSearch(
  json: unknown,
  queriedGenreSlug?: string
): AiShortSourceRecord[] {
  if (!json || typeof json !== 'object') return [];
  const root = json as Record<string, unknown>;
  const contents = (
    root.contents as Record<string, unknown> | undefined
  )?.twoColumnSearchResultsRenderer as Record<string, unknown> | undefined;
  const primary = contents?.primaryContents as Record<string, unknown> | undefined;
  const secList = primary?.sectionListRenderer as Record<string, unknown> | undefined;
  const sections = Array.isArray(secList?.contents) ? secList.contents : [];

  const records: AiShortSourceRecord[] = [];

  for (const sec of sections) {
    if (!sec || typeof sec !== 'object') continue;
    const itemSec = (sec as Record<string, unknown>).itemSectionRenderer as
      | Record<string, unknown>
      | undefined;
    const list = Array.isArray(itemSec?.contents) ? itemSec.contents : [];
    for (const item of list) {
      if (!item || typeof item !== 'object') continue;
      const v = (item as Record<string, unknown>).videoRenderer as
        | Record<string, unknown>
        | undefined;
      if (!v) continue;

      const videoId = typeof v.videoId === 'string' ? v.videoId.trim() : '';
      if (!videoId || !/^[A-Za-z0-9_-]{6,20}$/.test(videoId)) continue;

      const titleRuns = (v.title as Record<string, unknown> | undefined)?.runs;
      const title = Array.isArray(titleRuns)
        ? titleRuns
            .map((r) => (r && typeof r === 'object' ? String((r as Record<string, unknown>).text ?? '') : ''))
            .join('')
            .trim()
        : '';
      if (!title) continue;

      const ownerRuns = (v.ownerText as Record<string, unknown> | undefined)?.runs;
      const firstOwner =
        Array.isArray(ownerRuns) && ownerRuns[0] && typeof ownerRuns[0] === 'object'
          ? (ownerRuns[0] as Record<string, unknown>)
          : undefined;
      const channelName = firstOwner ? String(firstOwner.text ?? '').trim() : '';
      const nav = firstOwner?.navigationEndpoint as Record<string, unknown> | undefined;
      const browse = nav?.browseEndpoint as Record<string, unknown> | undefined;
      const channelId = browse ? String(browse.browseId ?? '').trim() : '';

      const durationText = String(
        (v.lengthText as Record<string, unknown> | undefined)?.simpleText ?? ''
      ).trim();
      const durationSeconds = parseYoutubeDurationClock(durationText);

      const snippets = Array.isArray(v.detailedMetadataSnippets)
        ? v.detailedMetadataSnippets
        : [];
      const firstSnippet =
        snippets[0] && typeof snippets[0] === 'object'
          ? (snippets[0] as Record<string, unknown>)
          : undefined;
      const snippetRuns = (firstSnippet?.snippetText as Record<string, unknown> | undefined)?.runs;
      const description = Array.isArray(snippetRuns)
        ? snippetRuns
            .map((r) => (r && typeof r === 'object' ? String((r as Record<string, unknown>).text ?? '') : ''))
            .join('')
            .trim()
        : '';

      const viewText = String(
        (v.viewCountText as Record<string, unknown> | undefined)?.simpleText ?? ''
      );
      const views = parseVietnameseCount(viewText);

      const publishedText = String(
        (v.publishedTimeText as Record<string, unknown> | undefined)?.simpleText ?? ''
      ).trim();

      records.push({
        videoId,
        title,
        description,
        channelId,
        channelName,
        publishedAt: publishedText,
        durationText,
        durationSeconds,
        views,
        thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
        isVietnameseHint: VIETNAMESE_AI_CHANNEL_IDS.has(channelId),
        isPureAiChannel: PURE_AI_CHANNEL_IDS.has(channelId),
        queriedGenreSlug,
      });
    }
  }

  return records;
}

export function isAuthenticChineseAiFilm(record: AiShortSourceRecord): boolean {
  const combined = `${record.title} ${record.channelName} ${record.description}`;
  if (REJECT_TUTORIAL_REGEX.test(combined)) {
    return false;
  }

  if (
    typeof record.durationSeconds === 'number' &&
    record.durationSeconds > 0 &&
    record.durationSeconds < 35
  ) {
    return false;
  }

  if (record.isPureAiChannel || PURE_AI_CHANNEL_IDS.has(record.channelId)) {
    return true;
  }

  return STRICT_AI_MARKER_REGEX.test(combined);
}

export function isVietnameseAiShortRecord(record: AiShortSourceRecord): boolean {
  if (record.isVietnameseHint || VIETNAMESE_AI_CHANNEL_IDS.has(record.channelId)) {
    return true;
  }
  const combined = `${record.title} ${record.channelName} ${record.description}`.toLowerCase();
  return /(vietsub|thuyết minh|sora dub|phim ai|phim ngắn ai|tập \d|phần \d)/i.test(combined);
}

const CJK_NUMBER_MAP: Record<string, number> = {
  一: 1,
  二: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
  八: 8,
  九: 9,
  十: 10,
};

function parseSmallNumberToken(raw: string): number {
  const clean = raw.trim();
  if (/^\d+$/.test(clean)) return Number(clean);
  if (clean in CJK_NUMBER_MAP) return CJK_NUMBER_MAP[clean];
  return 1;
}

const NOISE_SEGMENT_REGEX =
  /^(?:phim\s*(?:ngắn|dài|hoạt hình|kinh dị|cổ trang|tình cảm|zombie|đam mỹ|bách hợp|bl|gl)?\s*(?:ai)?(?:\s*vietsub)?(?:\s*thuyết minh)?|vietsub|engsub|viet\/eng\s*sub|multi\s*sub|thuyết minh|lồng tiếng|full(?:\s*hd|\s*version|\s*tập|\s*trọn\s*bộ)?|trọn\s*bộ|3d\s*ai(?:\s*vietsub)?|sora\s*dub|ai\s*drama|godsub|yuris\s*vietsub|makasub|cáo\s*nhỏ\s*review|zoo\s*ai\s*phim|phim\s*zombie|song\s*nam\s*chủ|ai\s*song\s*nam\s*chủ|phim\s*hay|bl\s*vietsub|gl\s*vietsub|đam\s*mỹ\s*vietsub|bách\s*hợp\s*vietsub|phim\s*bl\s*ai|phim\s*hoạt\s*hình\s*đam\s*mỹ(?:\s*hay)?|tổng\s*hợp|tuyển\s*tập)$/i;

const GENERIC_SERIES_WORDS = new Set([
  'phim',
  'ngắn',
  'dài',
  'bộ',
  'lẻ',
  'hay',
  'mới',
  'hot',
  'full',
  'trọn',
  'hd',
  '4k',
  'vietsub',
  'engsub',
  'sub',
  'viet',
  'eng',
  'multi',
  'thuyết',
  'minh',
  'lồng',
  'tiếng',
  'sora',
  'dub',
  'ai',
  '3d',
  '2d',
  'aigc',
  'drama',
  'short',
  'shorts',
  'review',
  'tóm',
  'tắt',
  'hoạt',
  'hình',
  'anime',
  'donghua',
  'trung',
  'quốc',
  'bl',
  'gl',
  'đam',
  'mỹ',
  'bách',
  'hợp',
  'ngôn',
  'tình',
  'song',
  'nam',
  'chủ',
  'cổ',
  'trang',
  'tiên',
  'hiệp',
  'huyền',
  'huyễn',
  'kinh',
  'dị',
  'tổng',
  'tài',
  'xuyên',
  'không',
  'trọng',
  'sinh',
  'học',
  'đường',
  'hành',
  'động',
  'cảm',
  'tâm',
  'lý',
  'hài',
  'hước',
  'tập',
  'phần',
  'part',
  'ep',
  'mùa',
  'season',
  'version',
  'ver',
  'chương',
  'hồi',
  'cuối',
  'tổng',
  'hợp',
  'tuyển',
  'bản',
  'video',
  'movie',
  'series',
  'trailer',
  'teaser',
  'p',
  'ep1',
  'ep2',
  'ep3',
  'ep4',
  'ep5',
  'p1',
  'p2',
  'p3',
  'p4',
  'p5',
]);

function isGenericOnlyNormalizedTitle(normalizedChars: string): boolean {
  const words = normalizedChars.split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  return words.every(
    (w) =>
      /^\d+(?:\.\d+)?$/.test(w) ||
      /^(?:ep|p|tập|phần|part)\d+$/i.test(w) ||
      GENERIC_SERIES_WORDS.has(w)
  );
}

// Unicode-safe token boundaries that never split inside Vietnamese diacritics (e.g. "TẬP 10" != "p 10")
const TOK_START = '(?:^|(?<=[\\s(\\[【《|/\\\\\\-–—:·•.,~]))';
const TOK_END = '(?=$|[\\s)\\]】》|/\\\\\\-–—:·•.,~?!])';

export function extractAiSeriesMeta(rawTitle: string, channelName = ''): AiSeriesMeta {
  const title = rawTitle.trim();
  let seasonNum = 0;
  let episodeStart = 0;
  let episodeEnd = 0;
  let hasExplicitPart = false;
  let isFullCompilation = false;
  let partLabel = 'Full';

  // Detect Chinese book-bracket title ONLY when the bracketed string actually contains >= 2 CJK chars
  const cjkBookMatches = Array.from(title.matchAll(/《([^》]{2,90})》/g));
  const cjkBookMatch = cjkBookMatches.find((m) => /[\u4e00-\u9fff]{2,}/.test(m[1])) ?? null;

  // Detect season / part / episode markers in full title using Unicode-safe word delimiters
  const seasonCnMatch = title.match(/第\s*([0-9一二三四五六七八九十]+)\s*[季部]/);
  const fullRangePartsMatch = title.match(
    new RegExp(`${TOK_START}full\\s*(?:phần|part|p\\.?)\\s*(\\d+)\\s*[-–~]\\s*(\\d+)${TOK_END}`, 'i')
  );
  const seasonVnMatch = title.match(
    new RegExp(
      `${TOK_START}(?:phần\\s*(\\d+)(?:\\s*[-–~]\\s*(\\d+))?|mùa\\s*(\\d+)|season\\s*(\\d+)|part\\s*(\\d+)|version\\s*(\\d+)|p\\.?\\s*(\\d+))${TOK_END}`,
      'i'
    )
  );
  const cjkHalfMatch = title.match(/(?:[（(]\s*(上|中|下)\s*[)）]|(?:^|\s)(上|中|下)集(?=$|\s))/);

  const epRangeCnMatch = title.match(/第\s*(\d+)\s*[~～\-–—]\s*(\d+)\s*集/);
  const epSingleCnMatch = !epRangeCnMatch ? title.match(/第\s*(\d+)\s*集/) : null;
  const epVnMatch = title.match(
    new RegExp(
      `${TOK_START}(?:tập\\s*(\\d+(?:\\.\\d+)?)(?:\\s*[-–~]\\s*(?:tập\\s*)?(\\d+(?:\\.\\d+)?))?|ep\\.?\\s*(\\d+(?:\\.\\d+)?)(?:\\s*[-–~]\\s*(?:ep\\.?\\s*)?(\\d+(?:\\.\\d+)?))?|hồi\\s*(\\d+)|chương\\s*(\\d+))${TOK_END}`,
      'i'
    )
  );
  const isFinalEp = new RegExp(
    `${TOK_START}(?:tập\\s*cuối|phần\\s*cuối|大结局)${TOK_END}`,
    'i'
  ).test(title);
  const hasFullWord = new RegExp(
    `${TOK_START}(?:full\\s*trọn\\s*bộ|trọn\\s*bộ|full\\s*all|合集|完结版)${TOK_END}`,
    'i'
  ).test(title);

  if (fullRangePartsMatch) {
    isFullCompilation = true;
    hasExplicitPart = true;
    partLabel = `Full P.${fullRangePartsMatch[1]}-${fullRangePartsMatch[2]}`;
  } else if (seasonVnMatch) {
    hasExplicitPart = true;
    if (seasonVnMatch[2]) {
      isFullCompilation = true;
      partLabel = `Full P.${seasonVnMatch[1]}-${seasonVnMatch[2]}`;
    } else {
      seasonNum = Number(
        seasonVnMatch[1] ||
          seasonVnMatch[3] ||
          seasonVnMatch[4] ||
          seasonVnMatch[5] ||
          seasonVnMatch[6] ||
          seasonVnMatch[7] ||
          1
      );
      partLabel = `Phần ${seasonNum}`;
    }
  } else if (seasonCnMatch) {
    hasExplicitPart = true;
    seasonNum = parseSmallNumberToken(seasonCnMatch[1]);
    partLabel = `Phần ${seasonNum}`;
  } else if (cjkHalfMatch) {
    hasExplicitPart = true;
    const half = cjkHalfMatch[1] || cjkHalfMatch[2];
    seasonNum = half === '上' ? 1 : half === '中' ? 2 : 3;
    partLabel = half === '上' ? 'Phần 1 (Thượng)' : half === '中' ? 'Phần 2 (Trung)' : 'Phần Cuối (Hạ)';
  }

  if (epRangeCnMatch) {
    episodeStart = Number(epRangeCnMatch[1]);
    episodeEnd = Number(epRangeCnMatch[2]);
    if (!hasExplicitPart) {
      hasExplicitPart = episodeStart > 1 || !/第?\s*1\s*[~～\-–—]\s*\d+/.test(epRangeCnMatch[0]);
      partLabel = `Tập ${episodeStart}-${episodeEnd}`;
    } else if (seasonNum > 0) {
      partLabel = `Phần ${seasonNum} · Tập ${episodeStart}-${episodeEnd}`;
    }
  } else if (epSingleCnMatch) {
    hasExplicitPart = true;
    episodeStart = Number(epSingleCnMatch[1]);
    partLabel = seasonNum > 0 ? `Phần ${seasonNum} · Tập ${episodeStart}` : `Tập ${episodeStart}`;
  } else if (epVnMatch) {
    hasExplicitPart = true;
    episodeStart = Number(epVnMatch[1] || epVnMatch[3] || epVnMatch[5] || epVnMatch[6] || 1);
    const endRaw = epVnMatch[2] || epVnMatch[4];
    episodeEnd = endRaw ? Number(endRaw) : 0;
    const epStr = episodeEnd > 0 ? `Tập ${episodeStart}-${episodeEnd}` : `Tập ${episodeStart}`;
    partLabel = seasonNum > 0 ? `Phần ${seasonNum} · ${epStr}` : epStr;
  } else if (isFinalEp) {
    hasExplicitPart = true;
    episodeStart = 9999;
    partLabel = seasonNum > 0 ? `Phần ${seasonNum} · Tập Cuối` : 'Tập Cuối';
  } else if (hasFullWord && !hasExplicitPart) {
    isFullCompilation = true;
    partLabel = 'Bản Full';
  }

  let partOrder = 1;
  if (isFullCompilation) {
    partOrder = 900_000;
  } else if (seasonNum > 0 || episodeStart > 0) {
    partOrder = seasonNum * 10_000 + episodeStart;
  }

  // Build normalized seriesKey + readable seriesTitle
  let coreTitle = '';
  let keyPrefix = 'vn:';

  if (cjkBookMatch) {
    keyPrefix = 'cn:';
    coreTitle = cjkBookMatch[1]
      .replace(/第\s*[0-9一二三四五六七八九十]+\s*[季部]/g, '')
      .replace(/[（(]\s*(?:上|中|下)\s*[)）]/g, '')
      .trim();
  } else {
    // Clean hashtags, emojis, and non-title metadata brackets first
    const cleaned = title
      .replace(/#\S+/g, ' ')
      .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\uFE0F]/gu, ' ')
      .replace(/【[^】]*】/g, ' ')
      .replace(/《\s*(?:ep|tập|phần|part|full|vietsub|bl|gl|ai)[^》]*》/gi, ' ')
      .replace(
        /\[[^\]]*(?:phim\s*(?:ai|bl|gl)|viet\s*\/?\s*eng|eng\s*sub|\bai\b|vietsub|thuyết\s*minh|lồng\s*tiếng|full|hd|3d|review|short|drama|đam\s*mỹ|bách\s*hợp)[^\]]*\]/gi,
        ' '
      );

    const segments = cleaned
      .split(/\s*[|｜]\s*/)
      .map((s) => s.trim())
      .filter((s) => {
        if (!s) return false;
        if (channelName && s.toLowerCase() === channelName.trim().toLowerCase()) return false;
        if (NOISE_SEGMENT_REGEX.test(s)) return false;
        return true;
      });

    const stripPartTokens = (seg: string): string =>
      seg
        .replace(
          new RegExp(`${TOK_START}full\\s*(?:phần|part|p\\.?)\\s*\\d+\\s*[-–~]\\s*\\d+${TOK_END}`, 'gi'),
          ' '
        )
        .replace(
          /\[\s*(?:phần|part|p\.?|mùa|season|tập|ep\.?)\s*\d+(?:\.\d+)?(?:\s*[-–~]\s*(?:ep\.?|tập|phần|part|p\.?)?\s*\d+(?:\.\d+)?)?\s*\]/gi,
          ' '
        )
        .replace(
          /\(\s*(?:phần|part|p\.?|mùa|season|tập|ep\.?)\s*\d+(?:\.\d+)?(?:\s*[-–~]\s*(?:ep\.?|tập|phần|part|p\.?)?\s*\d+(?:\.\d+)?)?\s*\)/gi,
          ' '
        )
        .replace(
          new RegExp(
            `${TOK_START}(?:phần|part|mùa|season|version|chương|hồi)\\s*\\d+(?:\\.\\d+)?(?:\\s*[-–~]\\s*(?:phần|part)?\\s*\\d+(?:\\.\\d+)?)?${TOK_END}`,
            'gi'
          ),
          ' '
        )
        .replace(
          new RegExp(
            `${TOK_START}(?:tập|ep\\.?)\\s*\\d+(?:\\.\\d+)?(?:\\s*[-–~]\\s*(?:tập|ep\\.?)?\\s*\\d+(?:\\.\\d+)?)?${TOK_END}`,
            'gi'
          ),
          ' '
        )
        .replace(
          new RegExp(
            `${TOK_START}(?:tập\\s*cuối|phần\\s*cuối|full\\s*trọn\\s*bộ|trọn\\s*bộ|full\\s*tập|full\\s*hd|full\\s*version|3d\\s*ai\\s*vietsub|phim\\s*ai\\s*vietsub|phim\\s*bl\\s*ai|phim\\s*ai|phim\\s*ngắn\\s*ai|bl\\s*vietsub|đam\\s*mỹ\\s*vietsub)${TOK_END}`,
            'gi'
          ),
          ' '
        )
        .replace(new RegExp(`${TOK_START}p\\.?\\s*\\d+${TOK_END}`, 'gi'), ' ')
        .replace(/\[\s*(?:[-–—|/·•]*\s*)*\]/g, ' ')
        .replace(/\(\s*(?:[-–—|/·•]*\s*)*\)/g, ' ')
        .replace(/^[.\s\-–—:·•,|/]+|[.\s\-–—:·•,|/]+$/g, '')
        .replace(/\s{2,}/g, ' ')
        .trim();

    for (const seg of segments) {
      const stripped = stripPartTokens(seg);
      const normSeg = stripped
        .toLowerCase()
        .normalize('NFC')
        .replace(/[\s\-–—_:·•.,!?"'“”‘’()[\]【】《》/\\]+/g, ' ')
        .trim();
      if (
        stripped.length >= 4 &&
        !NOISE_SEGMENT_REGEX.test(stripped) &&
        !isGenericOnlyNormalizedTitle(normSeg)
      ) {
        coreTitle = stripped;
        break;
      }
    }

    if (!coreTitle && segments.length > 0) {
      coreTitle = stripPartTokens(segments[0]);
    }
  }

  const normalizedChars = coreTitle
    .toLowerCase()
    .normalize('NFC')
    .replace(/[\s\-–—_:·•.,!?"'“”‘’()[\]【】《》/\\]+/g, ' ')
    .trim();

  const isCjkCore = /[\u4e00-\u9fff]{2,}/.test(normalizedChars);
  const wordCount = normalizedChars.split(/\s+/).filter(Boolean).length;
  const isGenericOnly = !isCjkCore && isGenericOnlyNormalizedTitle(normalizedChars);
  const isReliableKey =
    !isGenericOnly &&
    (isCjkCore
      ? normalizedChars.replace(/\s+/g, '').length >= 2
      : normalizedChars.length >= 6 && wordCount >= 2);

  return {
    seriesKey: isReliableKey ? `${keyPrefix}${normalizedChars}` : `vid:${title.toLowerCase()}`,
    seriesTitle: coreTitle || title,
    partLabel,
    partOrder,
    hasExplicitPart,
    isFullCompilation,
  };
}

export function classifyAiShortGenres(record: AiShortSourceRecord): TaxonomyRef[] {
  const combined = `${record.title} ${record.description}`;
  const matched: TaxonomyRef[] = [];
  const seen = new Set<string>();

  if (record.queriedGenreSlug && GENRE_META_MAP[record.queriedGenreSlug]) {
    const slug = record.queriedGenreSlug;
    seen.add(slug);
    matched.push({ id: slug, name: GENRE_META_MAP[slug].name, slug });
  }

  for (const [slug, meta] of Object.entries(GENRE_META_MAP)) {
    if (seen.has(slug)) continue;
    if (meta.keywords.test(combined)) {
      seen.add(slug);
      matched.push({ id: slug, name: meta.name, slug });
    }
  }

  if (!seen.has('phim-ngan')) {
    matched.push({ id: 'phim-ngan', name: 'Phim Ngắn', slug: 'phim-ngan' });
  }

  return matched.slice(0, 6);
}

export function extractEpisodeBadge(
  title: string,
  durationSeconds: number | null,
  durationText: string
): string {
  const cnRange = title.match(/第?\s*(\d+\s*[~\-–—]\s*\d+)\s*集/);
  if (cnRange) {
    return `Tập ${cnRange[1].replace(/\s+/g, '')} · AI`;
  }
  const vnTap = title.match(
    new RegExp(
      `${TOK_START}(tập\\s*\\d+(?:\\.\\d+)?(?:\\s*[-–]\\s*\\d+(?:\\.\\d+)?)?|phần\\s*\\d+)${TOK_END}`,
      'i'
    )
  );
  if (vnTap) {
    return `${vnTap[1].trim()} · AI`;
  }
  if (/full|trọn bộ|全集|完结/i.test(title)) {
    const dur = formatVideoDurationLabel(durationSeconds, '');
    return dur ? `Trọn bộ · ${dur}` : 'Trọn bộ AI';
  }
  return formatVideoDurationLabel(durationSeconds, durationText || 'Phim AI');
}

export function scoreAiShortRecord(record: AiShortSourceRecord): number {
  let score = 0;
  if (isVietnameseAiShortRecord(record)) score += 60;
  if (record.isPureAiChannel || PURE_AI_CHANNEL_IDS.has(record.channelId)) score += 35;
  if (STRICT_AI_MARKER_REGEX.test(record.title)) score += 25;

  if (typeof record.durationSeconds === 'number') {
    if (record.durationSeconds >= 90 && record.durationSeconds <= 1800) {
      score += 20;
    } else if (record.durationSeconds > 1800) {
      score += 12;
    }
  }

  if (record.views >= 100000) score += 16;
  else if (record.views >= 10000) score += 10;
  else if (record.views >= 1000) score += 5;

  if (/2026/.test(`${record.publishedAt} ${record.title}`)) score += 8;
  else if (/2025/.test(`${record.publishedAt} ${record.title}`)) score += 4;

  return score;
}

export function groupAiShortSeries(records: AiShortSourceRecord[]): GroupedAiSeries[] {
  const unique = mergeAiShortRecords([records]);
  const buckets = new Map<
    string,
    {
      seriesTitle: string;
      parts: Array<
        AiShortSourceRecord & {
          partLabel: string;
          partOrder: number;
          hasExplicitPart: boolean;
          isFullCompilation: boolean;
        }
      >;
    }
  >();

  for (const rec of unique) {
    const meta = extractAiSeriesMeta(rec.title, rec.channelName);
    let bucketKey = meta.seriesKey.startsWith('vid:')
      ? `vid:${rec.videoId}`
      : meta.seriesKey;

    // Prevent unrelated cross-channel merging on short titles unless CJK >= 3 chars or >= 3 words / >= 14 chars
    if (!bucketKey.startsWith('vid:') && rec.channelId) {
      const bare = bucketKey.replace(/^(?:vn|cn):/, '');
      const isSpecificEnough = bucketKey.startsWith('cn:')
        ? bare.replace(/\s+/g, '').length >= 3
        : bare.split(/\s+/).length >= 3 || bare.length >= 14;
      if (!isSpecificEnough) {
        bucketKey = `${bucketKey}@@${rec.channelId}`;
      }
    }

    const existing = buckets.get(bucketKey);
    const taggedPart = {
      ...rec,
      partLabel: meta.partLabel,
      partOrder: meta.partOrder,
      hasExplicitPart: meta.hasExplicitPart,
      isFullCompilation: meta.isFullCompilation,
    };

    if (!existing) {
      buckets.set(bucketKey, {
        seriesTitle: meta.seriesTitle,
        parts: [taggedPart],
      });
    } else {
      existing.parts.push(taggedPart);
      if (
        meta.seriesTitle.length > 0 &&
        meta.seriesTitle.length < existing.seriesTitle.length &&
        meta.seriesTitle.length >= 4
      ) {
        existing.seriesTitle = meta.seriesTitle;
      }
    }
  }

  const groups: GroupedAiSeries[] = [];

  for (const [seriesKey, bucket] of buckets.entries()) {
    // Ensure uniqueness by videoId and natural chronological ordering
    const sortedParts = [...bucket.parts].sort((a, b) => {
      if (a.partOrder !== b.partOrder) return a.partOrder - b.partOrder;
      return b.views - a.views;
    });

    // Deduplicate labels if two uploads share same partOrder (e.g. different editions)
    const labelCounts = new Map<string, number>();
    const normalizedParts = sortedParts.map((p, idx) => {
      let label = p.partLabel;
      if (sortedParts.length > 1 && label === 'Full' && !p.isFullCompilation) {
        label = `Phần ${idx + 1}`;
      }
      const seenCount = labelCounts.get(label) ?? 0;
      labelCounts.set(label, seenCount + 1);
      if (seenCount > 0) {
        label = `${label} (${seenCount + 1})`;
      }
      return {
        ...p,
        partLabel: label,
      };
    });

    // Pick best representative thumbnail / record (prefer non-full Part 1 or highest score)
    const primary =
      normalizedParts.find((p) => !p.isFullCompilation) ?? normalizedParts[0];

    // Merge genres across all parts in the series
    const genreMap = new Map<string, TaxonomyRef>();
    for (const p of normalizedParts) {
      for (const g of classifyAiShortGenres(p)) {
        if (!genreMap.has(g.slug)) genreMap.set(g.slug, g);
      }
    }

    const totalViews = normalizedParts.reduce((sum, p) => sum + (p.views || 0), 0);
    const maxScore = normalizedParts.reduce(
      (max, p) => Math.max(max, scoreAiShortRecord(p)),
      0
    );
    const multiPartBoost = normalizedParts.length > 1 ? 18 : 0;

    groups.push({
      seriesKey,
      seriesTitle: normalizedParts.length > 1 ? bucket.seriesTitle : primary.title,
      primary,
      parts: normalizedParts,
      categories: Array.from(genreMap.values()).slice(0, 6),
      score: maxScore + multiPartBoost,
      totalViews,
      isVietnamese: normalizedParts.some((p) => isVietnameseAiShortRecord(p)),
    });
  }

  return groups;
}

export function findGroupedSeriesForVideoId(
  videoId: string,
  allRecords: AiShortSourceRecord[]
): GroupedAiSeries | null {
  const groups = groupAiShortSeries(allRecords);
  for (const g of groups) {
    if (g.parts.some((p) => p.videoId === videoId)) {
      return g;
    }
  }
  return null;
}

export function toAiShortMovieSummary(record: AiShortSourceRecord): MovieSummary {
  const isVi = isVietnameseAiShortRecord(record);
  const yearMatch = `${record.publishedAt} ${record.title}`.match(/(202[4-7])/);
  const year = yearMatch ? Number(yearMatch[1]) : 2026;

  const isDub = /(sora dub|thuyết minh|lồng tiếng)/i.test(
    `${record.title} ${record.channelName}`
  );
  const lang = isDub ? 'Vietsub + Thuyết Minh' : isVi ? 'Vietsub AI' : 'Phim AI Trung Quốc';

  const voteAverage =
    record.views >= 100000
      ? 9.2
      : record.views >= 25000
      ? 8.7
      : record.views >= 5000
      ? 8.3
      : 8.0;

  return {
    id: record.videoId,
    name: record.title,
    originName: `${record.channelName || 'AI Studio'} · YouTube AI`,
    slug: `${YT_AI_SLUG_PREFIX}${record.videoId}`,
    type: 'hoathinh',
    posterUrl: record.thumbnailUrl || `https://i.ytimg.com/vi/${record.videoId}/mqdefault.jpg`,
    thumbUrl: `https://i.ytimg.com/vi/${record.videoId}/hqdefault.jpg`,
    year,
    quality: 'HD · AI',
    lang,
    time: formatVideoDurationLabel(record.durationSeconds, record.durationText || 'Phim ngắn AI'),
    episodeCurrent: extractEpisodeBadge(
      record.title,
      record.durationSeconds,
      record.durationText
    ),
    categories: classifyAiShortGenres(record),
    countries: [{ id: 'trung-quoc', name: 'Trung Quốc', slug: 'trung-quoc' }],
    rating: {
      voteAverage,
      voteCount: Math.max(12, Math.round(record.views / 120)),
    },
    modifiedAt: record.publishedAt || new Date().toISOString(),
  };
}

export function toGroupedAiShortMovieSummary(group: GroupedAiSeries): MovieSummary {
  const base = toAiShortMovieSummary({
    ...group.primary,
    views: group.totalViews,
  });

  if (group.parts.length <= 1) {
    return base;
  }

  const groupParts: MovieGroupPart[] = group.parts.map((p) => ({
    videoId: p.videoId,
    label: p.partLabel,
    title: p.title,
  }));

  return {
    ...base,
    name: group.seriesTitle || base.name,
    type: 'series',
    categories: group.categories.length > 0 ? group.categories : base.categories,
    episodeCurrent: `Bộ ${group.parts.length} phần · AI`,
    groupParts,
  };
}

export function buildYoutubeAiDetail(
  input: AiShortSourceRecord | GroupedAiSeries
): MovieDetail {
  const isGroup = 'parts' in input;
  const primary = isGroup ? input.primary : input;
  const summary = isGroup
    ? toGroupedAiShortMovieSummary(input)
    : toAiShortMovieSummary(input);

  const watchUrl = `https://www.youtube.com/watch?v=${primary.videoId}`;
  const isVi = isGroup ? input.isVietnamese : isVietnameseAiShortRecord(primary);

  const episodes: EpisodeItem[] = isGroup
    ? input.parts.map((part, idx) => ({
        name: part.partLabel || `Phần ${idx + 1}`,
        slug: `p${idx + 1}-${part.videoId}`,
        filename: part.title,
        linkEmbed: `https://www.youtube.com/embed/${part.videoId}?autoplay=1&rel=0`,
        linkM3u8: '',
      }))
    : [
        {
          name: 'Full',
          slug: 'full',
          filename: primary.title,
          linkEmbed: `https://www.youtube.com/embed/${primary.videoId}?autoplay=1&rel=0`,
          linkM3u8: '',
        },
      ];

  const multiPartDesc =
    isGroup && input.parts.length > 1
      ? ` Tuyển tập đã gộp đủ ${input.parts.length} phần (${input.parts
          .map((p) => p.partLabel)
          .join(', ')}) để xem liền mạch.`
      : '';

  return {
    ...summary,
    content:
      (primary.description ||
        `Tác phẩm phim ngắn AI Trung Quốc "${summary.name}" từ kênh ${
          primary.channelName || 'YouTube AI'
        }, được tổng hợp trực tiếp để phát ngay trong rạp CineVault.`) + multiPartDesc,
    status: 'completed',
    episodeTotal: episodes.length,
    actors: [primary.channelName || 'Nhà sáng tạo AI Trung Quốc'],
    directors: ['AI Generative Cinema'],
    trailerUrl: watchUrl,
    servers: [
      {
        serverName: isVi
          ? 'YouTube AI · Vietsub / Thuyết Minh'
          : 'YouTube AI · Bản Gốc Trung Quốc',
        episodes,
      },
    ],
  };
}

export function mergeAiShortRecords(groups: AiShortSourceRecord[][]): AiShortSourceRecord[] {
  const map = new Map<string, AiShortSourceRecord>();
  for (const group of groups) {
    for (const item of group) {
      if (!item.videoId) continue;
      const existing = map.get(item.videoId);
      if (!existing) {
        map.set(item.videoId, { ...item });
      } else {
        map.set(item.videoId, {
          ...existing,
          description:
            existing.description.length >= item.description.length
              ? existing.description
              : item.description,
          durationText: existing.durationText || item.durationText,
          durationSeconds: existing.durationSeconds ?? item.durationSeconds,
          views: Math.max(existing.views, item.views),
          publishedAt: existing.publishedAt || item.publishedAt,
          isVietnameseHint: existing.isVietnameseHint || item.isVietnameseHint,
          isPureAiChannel: existing.isPureAiChannel || item.isPureAiChannel,
          queriedGenreSlug: existing.queriedGenreSlug || item.queriedGenreSlug,
        });
      }
    }
  }
  return Array.from(map.values());
}

export function buildAiShortCatalogResponse(
  records: AiShortSourceRecord[],
  options: {
    category?: string;
    format?: AiShortFormatFilter;
    page?: number;
    limit?: number;
  } = {}
): CatalogResponse {
  const category = (options.category ?? '').trim();
  const format: AiShortFormatFilter = options.format ?? 'all';
  const page = Math.max(1, options.page ?? 1);
  const limit = Math.min(36, Math.max(6, options.limit ?? 24));

  const authentic = mergeAiShortRecords([records]).filter((rec) =>
    isAuthenticChineseAiFilm(rec)
  );

  // Group multi-part series together BEFORE category/format filtering so all parts stay intact
  let groupedPool = groupAiShortSeries(authentic);

  if (category && category !== 'phim-ngan') {
    const genreMatches = groupedPool.filter((grp) =>
      grp.categories.some((g) => g.slug === category)
    );
    if (genreMatches.length > 0) {
      groupedPool = genreMatches;
    }
  }

  const totalGroupedSeriesInPool = groupedPool.filter((g) => g.parts.length > 1).length;

  if (format === 'series') {
    const multiOnly = groupedPool.filter((g) => g.parts.length > 1);
    if (multiOnly.length > 0) groupedPool = multiOnly;
  } else if (format === 'vi-sub') {
    const viOnly = groupedPool.filter((g) => g.isVietnamese);
    if (viOnly.length > 0) groupedPool = viOnly;
  } else if (format === 'ultra-short') {
    const shortOnly = groupedPool.filter((g) =>
      g.parts.some(
        (r) =>
          (typeof r.durationSeconds === 'number' && r.durationSeconds <= 1500) ||
          /tập\s*\d|part\s*\d|ep\s*\d|shorts|vi phim|微电影|短片/i.test(r.title)
      )
    );
    if (shortOnly.length > 0) groupedPool = shortOnly;
  } else if (format === 'cn-raw') {
    const cnOnly = groupedPool.filter((g) => !g.isVietnamese);
    if (cnOnly.length > 0) groupedPool = cnOnly;
  }

  const sorted = [...groupedPool].sort((a, b) => b.score - a.score);
  const totalItems = sorted.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / limit));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * limit;
  const pageItems = sorted
    .slice(start, start + limit)
    .map(toGroupedAiShortMovieSummary);

  return {
    items: pageItems,
    pagination: {
      currentPage: safePage,
      totalPages,
      totalItems,
      totalItemsPerPage: limit,
    },
    titlePage: 'Phim Ngắn AI Trung Quốc',
    totalSourceVideos: authentic.length,
    groupedSeriesCount: totalGroupedSeriesInPool,
  };
}
