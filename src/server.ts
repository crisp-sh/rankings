import { scrapeRankings } from './scraper';
import { updateCache, getCache } from './cache';
import cron from 'node-cron';
import { readdir } from 'node:fs/promises';
import { basename, join } from 'node:path';

const DATA_DIR = './data';

Bun.serve({
  port: 3000,
  idleTimeout: 240,
  async fetch(req) {
    try {
      const url = new URL(req.url);
      const pathname = url.pathname;

      // --- Manual Scrape Trigger (Keep first for clarity) ---
      if (pathname === '/api/scrape') {
        try {
          console.log('🚀 Starting manual scrape...');
          const data = await scrapeRankings();
          await updateCache(data);
          console.log('✅ Manual scrape completed successfully.');
          return Response.json({ status: 'ok', updated: Object.keys(data) });
        } catch (error) {
          console.error('❌ Error during manual scrape:', error);
          return new Response('Internal Server Error during scrape', { status: 500 });
        }
      }

      // --- List Historical Rankings (Keep before specific history) ---
      if (pathname === '/api/rankings/history') {
        try {
          const files = await readdir(DATA_DIR);
          const historyFiles = files
            .filter(file => file.startsWith('rankings_') && file.endsWith('.json'))
            .sort()
            .reverse();
          return Response.json(historyFiles);
        } catch (error) {
          if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
            return Response.json([]);
          }
          console.error('❌ Error listing history files:', error);
          return new Response('Internal Server Error', { status: 500 });
        }
      }

      // --- Get Specific Historical Ranking ---
      const historyMatch = pathname.match(/^\/api\/rankings\/history\/(rankings_\d{8}_\d{6}\.json)$/);
      if (historyMatch) {
        const filename = historyMatch[1];
        // Basic validation to prevent path traversal
        if (filename !== basename(filename)) {
          return new Response('Invalid filename', { status: 400 });
        }
        const filePath = join(DATA_DIR, filename);
        try {
          const file = Bun.file(filePath);
          if (!(await file.exists())) {
            return new Response('History file not found', { status: 404 });
          }
          // Stream the file content directly for efficiency
          return new Response(file, {
            headers: { 'Content-Type': 'application/json' }
          });
        } catch (error) {
          console.error(`❌ Error reading history file ${filename}:`, error);
          return new Response('Internal Server Error', { status: 500 });
        }
      }

      // --- NEW: Get Rankings by Category (Simplified Route) ---
      const rankingMatch = pathname.match(/^\/api\/rankings\/([a-zA-Z0-9_-]+)$/);
      if (rankingMatch) {
        const requestedCategory = rankingMatch[1];
        let cacheKey = requestedCategory;

        // Handle special case for /seo -> marketing/seo
        if (requestedCategory === 'seo') {
          cacheKey = 'marketing/seo';
        }
        // Note: 'all' will work directly as cacheKey is 'all'

        try {
          console.log(`➡️ Request for category: ${requestedCategory} (using cache key: ${cacheKey})`);
          const cachedData = getCache(cacheKey); // Use the determined cacheKey
          if (cachedData.length === 0 && cacheKey !== 'all') {
            // Optionally return 404 if category exists but has no data (and isn't 'all')
            // console.log(`❓ No data found for category: ${cacheKey}`);
            // return new Response(`No data found for category: ${requestedCategory}`, { status: 404 });
          }
          return Response.json(cachedData);
        } catch (error) {
          console.error(`❌ Error fetching category ${requestedCategory} (key ${cacheKey}):`, error);
          return new Response('Internal Server Error', { status: 500 });
        }
      }

      // --- Not Found (Fallback) ---
      return new Response('Not Found', { status: 404 });
    } catch (error) {
      console.error('❌ Unhandled error in fetch handler:', error);
      return new Response('Internal Server Error', { status: 500 });
    }
  },
  error(error) {
    console.error('❌ Bun server error:', error);
    return new Response('Internal Server Error', { status: 500 });
  },
});

cron.schedule('0 0,12 * * *', async () => {
  console.log('🕑 Scheduled scrape:', new Date().toISOString());
  try {
    const data = await scrapeRankings();
    await updateCache(data);
    console.log('✅ Scheduled scrape completed successfully.');
  } catch (error) {
    console.error('❌ Error during scheduled scrape:', error);
  }
});

console.log('🚀 Server running on http://localhost:3000');
