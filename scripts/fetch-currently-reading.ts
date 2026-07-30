/**
 * Fetches the Goodreads public RSS feed for the "currently-reading" shelf
 * and writes public/currently-reading.json.
 *
 * Fallback: on failure with existing JSON, keep the file unchanged.
 * On failure with no JSON, write an empty books array.
 * Always exits 0 so builds are not blocked.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fetchCurrentlyReading } from '../src/lib/goodreads';

const OUTPUT_PATH = path.join(process.cwd(), 'public', 'currently-reading.json');

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
        shelfUrl: 'https://www.goodreads.com/review/list/18822228-mel?shelf=currently-reading',
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
  process.exitCode = 0;
});
