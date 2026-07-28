import { XMLParser } from 'fast-xml-parser';

export interface CurrentlyReadingBook {
  title: string;
  author: string;
  coverUrl: string;
  url: string;
}

export interface CurrentlyReadingData {
  updatedAt: string;
  shelfUrl: string;
  books: CurrentlyReadingBook[];
}

export const GOODREADS_USER_ID = '18822228';
export const GOODREADS_SHELF_URL =
  'https://www.goodreads.com/review/list/18822228-mel?shelf=currently-reading';
export const GOODREADS_RSS_URL = `https://www.goodreads.com/review/list_rss/${GOODREADS_USER_ID}?shelf=currently-reading`;
export const MAX_BOOKS = 5;

type RssItem = {
  title?: string;
  link?: string;
  book_id?: string | number;
  author_name?: string;
  book_medium_image_url?: string;
  book_large_image_url?: string;
  book_image_url?: string;
};

function text(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value);
  if (value && typeof value === 'object' && '#text' in value) {
    return String((value as { '#text': unknown })['#text']).trim();
  }
  return '';
}

function bookUrl(item: RssItem): string {
  const bookId = text(item.book_id);
  if (bookId) return `https://www.goodreads.com/book/show/${bookId}`;
  return text(item.link);
}

export function parseGoodreadsRss(xml: string): CurrentlyReadingBook[] {
  const parser = new XMLParser({
    ignoreAttributes: true,
    trimValues: true,
    isArray: (name) => name === 'item',
  });

  const parsed = parser.parse(xml) as {
    rss?: { channel?: { item?: RssItem | RssItem[] } };
  };

  const items = parsed.rss?.channel?.item;
  if (!items) return [];

  const list = Array.isArray(items) ? items : [items];

  return list.slice(0, MAX_BOOKS).map((item) => {
    const title = text(item.title);

    return {
      title,
      author: text(item.author_name),
      coverUrl:
        text(item.book_large_image_url) ||
        text(item.book_medium_image_url) ||
        text(item.book_image_url),
      url: bookUrl(item),
    };
  });
}

export async function fetchCurrentlyReading(): Promise<CurrentlyReadingData> {
  const response = await fetch(GOODREADS_RSS_URL, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; melc-portfolio/1.0)',
    },
  });

  if (!response.ok) {
    throw new Error(`Goodreads RSS fetch failed: ${response.status}`);
  }

  const xml = await response.text();
  const books = parseGoodreadsRss(xml);

  return {
    updatedAt: new Date().toISOString(),
    shelfUrl: GOODREADS_SHELF_URL,
    books,
  };
}
