# Real-Time Data Aggregation Service

A lightweight FX tracking application built with React and Node.js.

The application aggregates exchange-rate data from multiple external providers and provides a single backend API to the frontend with fallback and caching support.

## Initial thought process

My first practical experience with external APIs came from building a weather application. That project helped me understand how to make API requests, work with JSON responses, and display external data in a frontend.

After that, I participated in a hackathon where I gained more experience building applications around APIs and thinking about reliability and application architecture.

For this assessment, I wanted to apply those lessons to a financial-data use case.

Rather than having the React frontend directly depend on an external FX provider, I decided to create a Node.js aggregation layer.

The main priorities were:

1. Get real FX data working quickly.
2. Avoid relying on a single provider.
3. Keep the frontend independent from external providers.
4. Reduce unnecessary API requests through caching.
5. Make stale or unavailable data visible to the user.

## Architecture

                 ┌──────────────────┐
                 │   React Frontend │
                 └────────┬─────────┘
                          │
                          │ /api/rates
                          ▼
                 ┌──────────────────┐
                 │  Node.js Backend │
                 │  Aggregation API │
                 └────────┬─────────┘
                          │
                 ┌────────┴─────────┐
                 │                  │
                 ▼                  ▼
        ┌────────────────┐  ┌──────────────────┐
        │   Frankfurter  │  │ ExchangeRate-API │
        │    Primary     │  │     Fallback     │
        └────────────────┘  └──────────────────┘
                          │
                          ▼
                     Cache / Stale

## Features

* Real exchange-rate data
* Multiple currencies
* Base-currency selection
* Primary and fallback providers
* Provider health information
* 60-second backend caching
* Up to 24-hour stale-data fallback
* Provider conflict detection
* Warning messages for significant differences
* Loading state
* Error state
* Simple responsive React interface

## API

### Get exchange rates

```text
GET /api/rates?base=USD&symbols=EUR,GBP,INR
```

Example response:

```json
{
  "base": "USD",
  "rates": {
    "EUR": 0.86044,
    "GBP": 0.7391,
    "INR": 94.49
  },
  "source": "Frankfurter",
  "date": "2026-09-04",
  "stale": false,
  "cached": false,
  "ageSeconds": 0,
  "providers": {
    "frankfurter": "ok",
    "exchangeRateApi": "ok"
  },
  "warnings": []
}
```

## Failure handling

The backend uses the following order:

```text
Primary provider
      ↓
Fallback provider
      ↓
Cached data
      ↓
503 unavailable response
```

This prevents a temporary external API failure from immediately breaking the application.

When stale cached data is used, it is explicitly marked as stale so the frontend does not present it as fresh data.

## Running locally

### Backend

Open a terminal in:

```text
backend/
```

Install dependencies:

```bash
npm install
```

Start the server:

```bash
node server.js
```

The backend runs on:

```text
http://localhost:4000
```

Health check:

```text
http://localhost:4000/health
```

### Frontend

Open another terminal in:

```text
frontend/
```

Install dependencies:

```bash
npm install
```

Start Vite:

```bash
npm run dev
```

The frontend normally runs on:

```text
http://localhost:5173
```

The Vite development proxy forwards `/api` requests to the Node.js backend.

## Why a backend aggregation layer?

Calling an external API directly from React would make the frontend tightly coupled to that provider.

The backend provides a single interface:

```text
Frontend → /api/rates
```

The provider implementation can then change without requiring changes to the frontend.

The backend is also the appropriate place for:

* caching
* fallback logic
* provider comparison
* rate limiting
* logging
* monitoring
* future authentication
* premium/free-tier controls

## Trade-offs

Because this assessment had a limited implementation window, I intentionally prioritized reliability-related functionality over secondary product features.

I did not implement:

* Authentication
* Billing
* Historical charts
* Database persistence
* Advanced analytics
* Production monitoring
* Full automated test coverage

The core aggregation service was prioritized instead.

## Future improvements

With more development time, I would add:

* Redis/shared caching
* Rate limiting
* Automated tests
* Structured logging
* Monitoring
* Provider latency tracking
* Circuit breakers
* Additional FX providers
* Historical data visualization
* Authentication
* Free and paid user tiers
* Better data-freshness indicators

## Project structure

```cactro
/
├── decisions.md
├── backend/
│   ├── server.js
│   ├── package.json
│   └── package-lock.json
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   └── index.css
│   ├── vite.config.js
│   ├── package.json
│   └── package-lock.json
└── README.md

