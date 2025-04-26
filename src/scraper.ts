import { chromium } from 'playwright';

export interface ModelEntry {
  rank: number;
  name: string | null;
  link: string | null;
  description: string | null;
  context: number | null;
  tokens: number;
  tokenChangePercent: number | null;
  id: string;
}
export interface Rankings {
  [category: string]: ModelEntry[];
}

export async function scrapeRankings(): Promise<Rankings> {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const categories = [
    'all', 'roleplay', 'programming', 'marketing', 'marketing/seo', 'technology',
    'science', 'translation', 'legal', 'finance', 'health', 'trivia', 'academia'
  ];
  const results: Rankings = {};

  for (const cat of categories) {
    const path = cat === 'all' ? '' : `/${cat}`;
    const url = `https://openrouter.ai/rankings${path}`;
    console.log(`Scraping ${url}...`);
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
      await page.waitForSelector('div.grid.grid-cols-12.items-center', { timeout: 30000 });

      results[cat] = await page.$$eval('div.grid.grid-cols-12.items-center', (rows) => {
        function parseTokenValue(tokenStr: string | null | undefined): number {
          if (!tokenStr) return 0;
          const numStr = tokenStr.replace(/[^\d.-]/g, ''); // Keep digits, dot, and minus
          let num = Number.parseFloat(numStr);
          if (Number.isNaN(num)) return 0;

          const suffix = tokenStr.slice(-1).toUpperCase();
          if (suffix === 'B') {
            num *= 1e9; // Billion
          } else if (suffix === 'M') {
            num *= 1e6; // Million
          } else if (suffix === 'K') {
            num *= 1e3; // Thousand
          }
          return Math.round(num); // Return as integer
        }

        return rows.map((row) => {
          const rankEl = row.querySelector('div[class*="col-span-1"]');
          const nameLinkEl = row.querySelector('div[class*="col-span-7"] a');
          const descEl = row.querySelector('div[class*="col-span-7"] div.truncate');

          // New selectors for token info (within col-span-4)
          const tokenInfoEl = row.querySelector('div[class*="col-span-4"]');
          const tokenAmountEl = tokenInfoEl?.querySelector('div:not([class*="mt-1"])'); // The div containing "17.3B tokens"
          const tokenChangeEl = tokenInfoEl?.querySelector('div[title*="Increase"] span'); // The span within the title div

          const rank = Number.parseInt(rankEl?.textContent?.trim() || '0', 10);
          const name = nameLinkEl?.textContent?.trim() || null;
          const link = nameLinkEl?.getAttribute('href') || null;
          const descriptionWithContext = descEl?.textContent?.trim() || null;

          let description = descriptionWithContext;
          let context = null;
          if (descriptionWithContext?.includes(' • ')) {
            const parts = descriptionWithContext.split(' • ');
            description = parts[0]?.trim();
            const contextStr = parts[1]?.replace(/\D/g, '');
            if (contextStr) {
              context = Number.parseInt(contextStr, 10);
            }
          }

          const id = link?.split('/').pop() || '';

          // Parse new token data using the *locally defined* helper function
          const tokenAmountStr = tokenAmountEl?.textContent?.replace('tokens', '').trim();
          const tokens = parseTokenValue(tokenAmountStr); // Call locally defined function

          let tokenChangePercent: number | null = null;
          const tokenChangeStr = tokenChangeEl?.textContent?.replace(/[^\d.-]/g, ''); // Keep digits, dot, minus
          if (tokenChangeStr) {
            const parsedChange = Number.parseFloat(tokenChangeStr);
            if (!Number.isNaN(parsedChange)) {
              tokenChangePercent = parsedChange;
            }
          }

          return {
            rank,
            name,
            link,
            description,
            context,
            tokens,
            tokenChangePercent,
            id,
          };
        });
      });

      console.log(`Successfully scraped ${results[cat].length} entries for ${cat}.`);
    } catch (error) {
      console.error(`❌ Error scraping category ${cat} (${url}):`, error);
      results[cat] = [];
    }
  }

  await browser.close();
  console.log('✅ Scraping finished for all categories.');
  return results;
}
