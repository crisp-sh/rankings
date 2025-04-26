import type { Rankings, ModelEntry } from './scraper';
import { existsSync, mkdirSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

const DATA_DIR = './data';

// --- State Variables ---
// Use const for variables only assigned once
const LATEST_CACHE: Rankings = {}; // Will be populated by initializeCache
let latestCacheFilename: string | null = null;

// --- Initialization Function ---
async function initializeCache() {
  console.log('🚀 Initializing cache...');
  // 1. Ensure data directory exists
  try {
    if (!existsSync(DATA_DIR)) {
      mkdirSync(DATA_DIR, { recursive: true });
      console.log(`📂 Data directory created at ${DATA_DIR}`);
      // No files to load if directory was just created
      console.log('✅ Cache initialized (empty).');
      return;
    }
  } catch (error) {
    console.error(`❌ Error ensuring data directory ${DATA_DIR}:`, error);
    // Proceed with empty cache if directory check/creation fails
    console.log('⚠️ Cache initialized (empty due to directory error).');
    return;
  }

  // 2. Find the latest historical file
  let files: string[];
  try {
    files = await readdir(DATA_DIR);
  } catch (error) {
     console.error(`❌ Error reading data directory ${DATA_DIR}:`, error);
     console.log('⚠️ Cache initialized (empty due to directory read error).');
     return;
  }

  const historyFiles = files
    .filter(file => file.startsWith('rankings_') && file.endsWith('.json'))
    .sort(); // Sort alphabetically/chronologically (ascending)

  if (historyFiles.length === 0) {
    console.log(`ℹ️ No historical ranking files found in ${DATA_DIR}.`);
    console.log('✅ Cache initialized (empty).');
    return;
  }

  const recentFilename = historyFiles[historyFiles.length - 1]; // Get the last one (most recent)
  const latestFilePath = join(DATA_DIR, recentFilename);

  // 3. Load the latest file into the cache
  try {
    console.log(`💾 Attempting to load latest cache from ${latestFilePath}...`);
    const fileContent = await Bun.file(latestFilePath).text();
    if (fileContent) {
      const parsedData = JSON.parse(fileContent);
      // Assign loaded data to LATEST_CACHE (mutating the const object's properties is allowed)
      Object.assign(LATEST_CACHE, parsedData);
      latestCacheFilename = recentFilename; // Track the loaded file
      console.log(`✅ Cache successfully loaded from ${latestFilePath}`);
    } else {
      console.warn(`⚠️ Latest cache file ${latestFilePath} is empty.`);
      console.log('⚠️ Cache initialized (empty).');
    }
  } catch (error) {
    console.error(`❌ Error loading/parsing latest cache file (${latestFilePath}):`, error);
    // Keep cache empty if loading fails
    console.log('⚠️ Cache initialized (empty due to load/parse error).');
  }
}

// --- Exported Functions ---

export async function updateCache(data: Rankings): Promise<void> {
  // Update in-memory cache first (mutating the const object's properties)
  // Clear existing keys first in case new data has fewer categories
  for (const key in LATEST_CACHE) {
    if (Object.prototype.hasOwnProperty.call(LATEST_CACHE, key)) {
      delete LATEST_CACHE[key];
    }
  }
  Object.assign(LATEST_CACHE, data);
  console.log('🧠 In-memory cache updated with latest data.');

  // Generate timestamped filename
  const now = new Date();
  const timestamp = now.toISOString()
    .replace(/[:-]/g, '')
    .replace('T', '_')
    .split('.')[0];
  const filename = `rankings_${timestamp}.json`;
  const filePath = join(DATA_DIR, filename);

  // Asynchronously write the new data to its own timestamped file
  try {
    await Bun.write(filePath, JSON.stringify(data, null, 2));
    latestCacheFilename = filename; // Update the latest filename tracker
    console.log(`💾 Historical ranking saved to ${filePath}`);
  } catch (error) {
    console.error(`❌ Error writing historical ranking file ${filePath}:`, error);
  }
}

// getCache returns the LATEST data from the in-memory cache
export function getCache(category: string): ModelEntry[] {
  return LATEST_CACHE[category] || [];
}

// Optional: Function to get the filename of the latest saved cache
export function getLatestCacheFilename(): string | null {
  return latestCacheFilename;
}

// --- Run Initialization ---
// Use a self-invoking async function or top-level await
// Using .then/.catch for clarity around initialization completion/failure
initializeCache()
  .then(() => console.log('🏁 Cache initialization complete.'))
  .catch(error => console.error('💥 Unhandled error during cache initialization:', error));

