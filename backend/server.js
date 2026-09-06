const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4000;

let cache = null;

const CACHE_TTL = 60 * 1000;
const STALE_MAX_AGE = 24 * 60 * 60 * 1000;

const currencies = [
  "USD",
  "EUR",
  "GBP",
  "INR",
  "JPY",
  "AUD",
  "CAD",
  "CHF",
  "SGD",
  "AED",
];

function getSymbols(input) {
  const requested = (input || "EUR,GBP,INR,JPY")
    .split(",")
    .map((currency) => currency.trim().toUpperCase())
    .filter((currency) => currencies.includes(currency));

  return [...new Set(requested)];
}

async function fetchJSON(url) {
  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, 5000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Provider returned HTTP ${response.status}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

/*
  PRIMARY PROVIDER
  Frankfurter
*/
async function getFrankfurterRates(base, symbols) {
  const url =
    `https://api.frankfurter.app/latest?from=${base}` +
    `&to=${symbols.join(",")}`;

  const data = await fetchJSON(url);

  return {
    rates: data.rates || {},
    date: data.date,
  };
}

/*
  FALLBACK PROVIDER
  ExchangeRate-API public endpoint
*/
async function getFallbackRates(base) {
  const url =
    `https://open.er-api.com/v6/latest/${base}`;

  const data = await fetchJSON(url);

  if (data.result !== "success") {
    throw new Error("Fallback provider failed");
  }

  return {
    rates: data.rates || {},
    date: data.time_last_update_utc,
  };
}

function selectRates(rates, symbols) {
  const result = {};

  for (const currency of symbols) {
    if (rates[currency] !== undefined) {
      result[currency] = Number(rates[currency]);
    }
  }

  return result;
}

function compareRates(primary, fallback, symbols) {
  const warnings = [];

  for (const currency of symbols) {
    const first = primary[currency];
    const second = fallback[currency];

    if (!first || !second) {
      continue;
    }

    const difference =
      Math.abs(first - second) / Math.abs(first);

    if (difference > 0.01) {
      warnings.push(
        `${currency} differs by ${(difference * 100).toFixed(2)}%`
      );
    }
  }

  return warnings;
}

/*
  MAIN API ENDPOINT

  GET /api/rates?base=USD&symbols=EUR,GBP,INR
*/
app.get("/api/rates", async (req, res) => {
  const base = String(req.query.base || "USD").toUpperCase();

  const symbols = getSymbols(req.query.symbols)
    .filter((currency) => currency !== base);

  if (!currencies.includes(base)) {
    return res.status(400).json({
      error: "Unsupported base currency",
    });
  }

  if (symbols.length === 0) {
    return res.status(400).json({
      error: "No valid target currencies supplied",
    });
  }

  /*
    SHORT CACHE

    Prevents unnecessary provider calls
    when users refresh repeatedly.
  */
  if (
    cache &&
    cache.base === base &&
    cache.symbols.join(",") === symbols.join(",") &&
    Date.now() - cache.createdAt < CACHE_TTL
  ) {
    return res.json({
      ...cache.data,
      cached: true,
      ageSeconds: Math.floor(
        (Date.now() - cache.createdAt) / 1000
      ),
    });
  }

  /*
    Call both providers simultaneously.
  */
  const results = await Promise.allSettled([
    getFrankfurterRates(base, symbols),
    getFallbackRates(base),
  ]);

  const primary = results[0];
  const fallback = results[1];

  const providers = {
    frankfurter:
      primary.status === "fulfilled"
        ? "ok"
        : "failed",

    exchangeRateApi:
      fallback.status === "fulfilled"
        ? "ok"
        : "failed",
  };

  let rates;
  let source;
  let date;
  let warnings = [];

  /*
    PRIMARY WORKED
  */
  if (primary.status === "fulfilled") {
    rates = selectRates(
      primary.value.rates,
      symbols
    );

    source = "Frankfurter";
    date = primary.value.date;

    /*
      Compare against fallback
      when both providers work.
    */
    if (fallback.status === "fulfilled") {
      const fallbackRates = selectRates(
        fallback.value.rates,
        symbols
      );

      warnings = compareRates(
        rates,
        fallbackRates,
        symbols
      );
    }
  }

  /*
    PRIMARY FAILED
    Use fallback.
  */
  else if (fallback.status === "fulfilled") {
    rates = selectRates(
      fallback.value.rates,
      symbols
    );

    source = "ExchangeRate-API";
    date = fallback.value.date;

    warnings.push(
      "Primary provider failed. Showing fallback data."
    );
  }

  /*
    BOTH PROVIDERS FAILED
    Use cached data if available.
  */
  else if (
    cache &&
    cache.base === base &&
    cache.symbols.join(",") === symbols.join(",") &&
    Date.now() - cache.createdAt < STALE_MAX_AGE
  ) {
    return res.json({
      ...cache.data,
      stale: true,
      cached: true,
      ageSeconds: Math.floor(
        (Date.now() - cache.createdAt) / 1000
      ),
      providers,
    });
  }

  /*
    Nothing available.
  */
  else {
    return res.status(503).json({
      error: "Exchange-rate providers unavailable.",
      message:
        "Please try again shortly.",
      providers,
    });
  }

  const data = {
    base,
    rates,
    source,
    date,
    stale: false,
    cached: false,
    ageSeconds: 0,
    providers,
    warnings,
  };

  /*
    Save successful response.
  */
  cache = {
    base,
    symbols,
    createdAt: Date.now(),
    data,
  };

  res.json(data);
});

/*
  Health check
*/
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
  });
});

app.listen(PORT, () => {
  console.log(
    `Backend running at http://localhost:${PORT}`
  );
});