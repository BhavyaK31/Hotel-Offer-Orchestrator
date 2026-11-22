# Hotel Offer Orchestrator

A TypeScript/Express service that concurrently fetches mock hotel inventory from two suppliers, uses a Temporal workflow to select the cheapest offer per hotel name, and stores the deduplicated result in Redis. Price filtering is executed by Redis using a sorted set.

## Architecture

- **Express API**: `GET /api/hotels`, mock supplier endpoints, and `/health`.
- **Temporal workflow**: runs Supplier A and Supplier B activities concurrently, chooses the lowest-priced offer per normalized hotel name, then invokes a cache activity.
- **Redis**: stores hotel names in a per-city sorted set scored by price, with offer JSON in a hash. `ZRANGEBYSCORE` performs min/max filtering.
- **Worker**: separate process polling the Temporal task queue.

## Run with Docker Compose

Requirements: Docker Engine and Docker Compose v2.

```bash
docker compose up --build
```

Wait for the API and worker containers to start. The API is at `http://localhost:3000`; Temporal Web UI is at `http://localhost:8233`.

## API

### Aggregate offers

```bash
curl "http://localhost:3000/api/hotels?city=delhi"
```

Example response (sorted by hotel name):

```json
[
  {"name":"Holtin","price":5340,"supplier":"Supplier B","commissionPct":20},
  {"name":"Park Plaza","price":6800,"supplier":"Supplier B","commissionPct":12},
  {"name":"Radison","price":5900,"supplier":"Supplier A","commissionPct":13},
  {"name":"The Grand","price":7200,"supplier":"Supplier A","commissionPct":15}
]
```

### Filter by price (inclusive)

```bash
curl "http://localhost:3000/api/hotels?city=delhi&minPrice=5000&maxPrice=6000"
```

Both price bounds are optional. If omitted, the range is unbounded. Invalid negative values or `minPrice > maxPrice` return HTTP 400.

### Mock suppliers

```bash
curl "http://localhost:3000/supplierA/hotels?city=delhi"
curl "http://localhost:3000/supplierB/hotels?city=delhi"
```

### Health

```bash
curl "http://localhost:3000/health"
```

Reports the health of both supplier endpoints and Redis. Returns HTTP 503 if any dependency is unhealthy.

## Postman

Import `postman/Hotel-Offer-Orchestrator.postman_collection.json` into Postman. It includes:
- Delhi with overlapping supplier hotels
- Delhi price-range filtering
- A city with no results
- Each mock supplier endpoint
- Health check

## Local development (optional)

Requires Node.js 22+, Redis, and a Temporal dev server reachable at `localhost:7233`.

```bash
cp .env.example .env
npm install
npm run build
npm run start:api
```

In another terminal:

```bash
npm run start:worker
```

## Design notes

- Matching is case-insensitive and trims surrounding whitespace; the winning record retains the supplier's original display name.
- Equal prices keep the first record encountered (Supplier A).
- The workflow owns the comparison logic; the API reads the completed workflow's result from Redis.
- The API starts a fresh workflow for each request so supplier data is refreshed on each call.
- Redis keys: `hotels:<city>:by-price` (sorted set) and `hotels:<city>:data` (hash).
- Supplier mock datasets contain shared hotel names plus supplier-exclusive hotels across Delhi.
