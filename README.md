# LLM Rankings Scraper & API

Scrapes LLM ranking data from [openrouter.ai/rankings](https://openrouter.ai/rankings) and provides an API to access the latest and historical rankings.

## Setup

1.  **Install Dependencies:**
    ```bash
    bun install
    ```

2.  **Install Playwright Browsers & Dependencies:**
    Playwright is used for scraping. You need to download the necessary browser binaries and system dependencies.
    
    Install browsers
    ```bash
    bunx playwright install
    ```

    Install playwright dependencies
    ```bash
    sudo bunx playwright install-deps
    ```

## Running the Server

Start the development server with hot-reloading:

```bash
bun --watch run src/server.ts
```

The server will run on `http://localhost:3000`.

*(Note: Production build/start steps might need adjustment based on deployment strategy, but `bun run src/server.ts` can also be used directly.)*

## Data Storage

*   **Latest Cache:** The most recently scraped data is kept in memory for fast API access.
*   **Historical Data:** Each scrape's results are saved as a timestamped JSON file (e.g., `rankings_YYYYMMDD_HHMMSS.json`) in the `./data/` directory.
*   **Cache Loading:** On server startup, the latest file from the `./data/` directory is loaded into the in-memory cache.

## API Endpoints

| Method | Path                              | Description                                      |
|--------|-----------------------------------|--------------------------------------------------|
| `GET`  | `/api/rankings/{category}`        | Get latest rankings for a specific category.     |
| `GET`  | `/api/scrape`                     | Trigger a manual scrape and update cache.        |
| `GET`  | `/api/rankings/history`           | List available historical ranking file names.    |
| `GET`  | `/api/rankings/history/{filename}` | Get the full data for a specific historical file. |

### Get Latest Rankings by Category

Retrieves the most recently scraped and cached rankings for a specific category.

*   **URL:** `/api/rankings/{category}`
*   **Method:** `GET`
*   **{category}:** The category name (e.g., `all`, `programming`, `science`, `seo`).
    *   Use `all` for the combined rankings.
    *   Use `seo` as a shortcut for the `marketing/seo` category.

**Example:**
```bash
curl http://localhost:3000/api/rankings/programming
curl http://localhost:3000/api/rankings/seo # Gets marketing/seo data
curl http://localhost:3000/api/rankings/all
```

**Response:** An array of `ModelEntry` objects for the category:
```json
[
  {
    "rank": 1,
    "name": "Anthropic: Claude 3.7 Sonnet",
    "link": "/anthropic/claude-3.7-sonnet",
    "description": "Claude 3.7 Sonnet is an advanced large language model...",
    "context": 200000,
    "tokens": 1430000000,
    "tokenChangePercent": 12,
    "id": "claude-3.7-sonnet"
  },
  // ... more models
]
```

### Trigger Manual Scrape

Manually triggers the scraping process. Updates the in-memory cache and saves a new historical file.

*   **URL:** `/api/scrape`
*   **Method:** `GET`

**Example:**
```bash
curl http://localhost:3000/api/scrape
```

**Response:**
```json
{
  "status": "ok",
  "updated": ["all", "roleplay", "programming", "marketing", "marketing/seo", "technology", "science", "translation", "legal", "finance", "health", "trivia", "academia"]
}
```

### List Historical Rankings

Retrieves a list of available historical ranking snapshot filenames.

*   **URL:** `/api/rankings/history`
*   **Method:** `GET`

**Example:**
```bash
curl http://localhost:3000/api/rankings/history
```

**Response:** A JSON array of filenames, sorted newest first:
```json
[
  "rankings_20250426_160000.json",
  "rankings_20250426_151545.json",
  // ... more filenames
]
```

### Get Specific Historical Ranking

Retrieves the full ranking data from a specific historical snapshot file.

*   **URL:** `/api/rankings/history/{filename}`
*   **Method:** `GET`
*   **{filename}:** The exact filename obtained from the `/api/rankings/history` endpoint.

**Example:**
```bash
curl http://localhost:3000/api/rankings/history/rankings_20250426_151545.json
```

**Response:** The full `Rankings` JSON object as stored in that file.

---

Built with Bun and Playwright.
