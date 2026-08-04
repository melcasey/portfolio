/**
 * Fetches the Goodreads public RSS feed for the "currently-reading" shelf
 * and writes public/currently-reading.json.
 *
 * Zero npm dependencies (Node 22+ fetch + light RSS tag parsing) so GitHub
 * Actions does not need `npm ci` for this job.
 *
 * Fallback: on failure with existing JSON, keep the file unchanged.
 * On failure with no JSON, write an empty books array.
 */
import fs from 'node:fs/promises';
import path from 'node:path';

const GOODREADS_USER_ID = '18822228';
const GOODREADS_SHELF_URL =
  'https://www.goodreads.com/review/list/18822228-mel?shelf=currently-reading';
const GOODREADS_RSS_URL = `https://www.goodreads.com/review/list_rss/${GOODREADS_USER_ID}?shelf=currently-reading`;
const MAX_BOOKS = 5;
const OUTPUT_PATH = path.join(process.cwd(), 'public', 'currently-reading.json');

function tagValue(block, tag) {
  const cdata = block.match(new RegExp(`<${tag}><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`, 'i'));
  if (cdata) return cdata[1].trim();
  const plain = block.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'i'));
  return plain ? plain[1].trim() : '';
}

function parseItems(xml) {
  const items = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/gi;
  let match;
  while ((match = itemRe.exec(xml)) && items.length < MAX_BOOKS) {
    const block = match[1];
    const bookId = tagValue(block, 'book_id');
    const title = tagValue(block, 'title');
    const author = tagValue(block, 'author_name');
    const coverUrl =
      tagValue(block, 'book_large_image_url') ||
      tagValue(block, 'book_medium_image_url') ||
      tagValue(block, 'book_image_url');
    const link = tagValue(block, 'link');
    items.push({
      title,
      author,
      coverUrl,
      url: bookId ? `https://www.goodreads.com/book/show/${bookId}` : link,
    });
  }
  return items;
}

async function fetchCurrentlyReading() {
  const response = await fetch(GOODREADS_RSS_URL, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; melc-portfolio/1.0)',
    },
  });
  if (!response.ok) {
    throw new Error(`Goodreads RSS fetch failed: ${response.status}`);
  }
  const xml = await response.text();
  return {
    updatedAt: new Date().toISOString(),
    shelfUrl: GOODREADS_SHELF_URL,
    books: parseItems(xml),
  };
}

async function main() {
  try {
    await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
    const data = await fetchCurrentlyReading();
    await fs.writeFile(OUTPUT_PATH, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
    console.log(`Wrote ${data.books.length} book(s) to ${OUTPUT_PATH}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`Goodreads fetch failed: ${message}`);

    try {
      await fs.access(OUTPUT_PATH);
      console.warn('Keeping existing currently-reading.json');
    } catch {
      const fallback = {
        updatedAt: new Date().toISOString(),
        shelfUrl: GOODREADS_SHELF_URL,
        books: [],
      };
      await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
      await fs.writeFile(OUTPUT_PATH, `${JSON.stringify(fallback, null, 2)}\n`, 'utf8');
      console.warn('Wrote empty fallback currently-reading.json');
    }
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.warn(`Unexpected fetch script error: ${message}`);
});
