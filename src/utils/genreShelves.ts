import type { CatalogResponse, GenreShelf, MovieSummary } from '../types/movie';

export interface GenreShelfDefinition {
  slug: string;
  name: string;
  description: string;
}

export const CORE_GENRE_SHELF_DEFS: GenreShelfDefinition[] = [
  {
    slug: 'hanh-dong',
    name: 'Hành Động',
    description: 'Kịch tính, võ thuật và những pha rượt đuổi mãn nhãn',
  },
  {
    slug: 'tinh-cam',
    name: 'Tình Cảm',
    description: 'Những câu chuyện lãng mạn, sâu lắng và giàu cảm xúc',
  },
  {
    slug: 'tam-ly',
    name: 'Tâm Lý',
    description: 'Khai thác chiều sâu nội tâm và những nút thắt bất ngờ',
  },
  {
    slug: 'co-trang',
    name: 'Cổ Trang',
    description: 'Thế giới kiếm hiệp, cung đấu và sử thi hào hùng',
  },
  {
    slug: 'vien-tuong',
    name: 'Viễn Tưởng',
    description: 'Du hành vũ trụ, công nghệ tương lai và thế giới giả tưởng',
  },
  {
    slug: 'kinh-di',
    name: 'Kinh Dị',
    description: 'Hồi hộp, rùng rợn và những bí ẩn siêu nhiên đầy ám ảnh',
  },
  {
    slug: 'hai-huoc',
    name: 'Hài Hước',
    description: 'Giải trí nhẹ nhàng với những tình huống duyên dáng',
  },
  {
    slug: 'hinh-su',
    name: 'Hình Sự',
    description: 'Phá án căng thẳng, điều tra tội phạm và đấu trí nghẹt thở',
  },
];

export const EXTRA_GENRE_SHELF_DEFS: GenreShelfDefinition[] = [
  {
    slug: 'phieu-luu',
    name: 'Phiêu Lưu',
    description: 'Hành trình khám phá vùng đất mới đầy thử thách',
  },
  {
    slug: 'chinh-kich',
    name: 'Chính Kịch',
    description: 'Tác phẩm đậm chất nghệ thuật và thông điệp nhân văn',
  },
  {
    slug: 'bi-an',
    name: 'Bí Ẩn',
    description: 'Giải mã manh mối và những câu chuyện chưa có lời giải',
  },
  {
    slug: 'gia-dinh',
    name: 'Gia Đình',
    description: 'Ấm áp, gần gũi và gắn kết nhiều thế hệ',
  },
  {
    slug: 'phim-18',
    name: 'Phim 18+',
    description: 'Tuyển chọn phim tâm lý, chính kịch và lãng mạn gắn nhãn 18+',
  },
];

export const ALL_GENRE_SHELF_DEFS: GenreShelfDefinition[] = [
  ...CORE_GENRE_SHELF_DEFS,
  ...EXTRA_GENRE_SHELF_DEFS,
];

export function findGenreShelfDefinition(slug: string): GenreShelfDefinition {
  const found = ALL_GENRE_SHELF_DEFS.find((def) => def.slug === slug);
  if (found) return found;
  return {
    slug,
    name: slug,
    description: 'Tuyển chọn phim nổi bật theo thể loại',
  };
}

export function assembleGenreShelves(
  entries: Array<{ def: GenreShelfDefinition; catalog: CatalogResponse | null }>,
  limit = 6,
  initialSeenSlugs: Iterable<string> = []
): GenreShelf[] {
  const seenAcrossShelves = new Set<string>(initialSeenSlugs);
  const shelves: GenreShelf[] = [];

  for (const entry of entries) {
    if (!entry.catalog || entry.catalog.items.length === 0) continue;

    const uniqueItems: MovieSummary[] = [];
    const fallbackItems: MovieSummary[] = [];

    for (const item of entry.catalog.items) {
      if (!seenAcrossShelves.has(item.slug)) {
        uniqueItems.push(item);
      } else {
        fallbackItems.push(item);
      }
    }

    const picked = [...uniqueItems, ...fallbackItems].slice(0, limit);
    for (const item of picked) {
      seenAcrossShelves.add(item.slug);
    }

    if (picked.length > 0) {
      shelves.push({
        slug: entry.def.slug,
        name: entry.def.name,
        description: entry.def.description,
        totalItems: Math.max(picked.length, entry.catalog.pagination.totalItems || 0),
        items: picked,
      });
    }
  }

  return shelves;
}
