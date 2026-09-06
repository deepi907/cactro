Architecture Decisions

## 1. Which APIs did I choose and why?

I chose **Frankfurter** as the primary FX data provider and **ExchangeRate-API's public endpoint** as the fallback.
I chose frankfurther because ai gives a strong rating for this and does not require an API key for this assessment


I chose a second provider because relying on a single external API creates a single point of failure. Using two providers allows the backend to continue serving data when the primary provider is unavailable.

My previous weather application gave me my first practical experience working with external APIs. More recently, participating in a hackathon helped me understand that API integration also needs to consider reliability, failure handling, and user experience. I applied that learning here by putting the external APIs behind my own backend instead of calling them directly from React.

## 2. What's my fallback strategy when an API fails?

The backend requests both providers in parallel.

The priority is:

1. Frankfurter as the primary source
2. ExchangeRate-API as the fallback
3. Previously cached data if both providers fail
4. HTTP 503 with a clear error if no usable data is available

If Frankfurter fails but the fallback provider succeeds, the application continues working and identifies the fallback source in the response.

If both providers fail, the backend can return previously cached data for up to 24 hours and mark it as stale.

## 3. How do I handle conflicting data?

When both providers successfully return rates, the backend compares the values for the requested currencies.

If the difference is greater than **1%**, a warning will be generated.

I chose not to average the two values because averaging could hide a problem with one provider. Instead, Frankfurter remains the primary displayed source while the disagreement is surfaced as a warning.

## 4. What does the user see when things fail or data is stale?

The UI has different states for different situations.

### Normal state

The user sees the exchange rates and the provider source.

### Primary provider failure

The fallback provider supplies the rates, and the UI can communicate that fallback data is being used.

### Cached/stale data

Previously available rates can still be displayed, but the response is marked as stale rather than pretending the data is fresh.

### Complete failure

If no fresh or cached data is available, the backend returns an error instead of showing incorrect values. The frontend displays a clear "Data unavailable" message.

This makes the degraded state visible to the user instead of failing silently.

## 5. Did I improve the staleness of data?

Yes.

I added a short **60-second backend cache** to avoid repeatedly requesting the external providers when users refresh frequently.

This improves both efficiency and reliability:

* Fewer unnecessary provider requests
* Lower external API usage
* Faster responses for repeated requests
* Less dependence on provider availability for every request

I also added a **24-hour stale-data window**. If both providers become unavailable, the application can use previously cached data within that window and explicitly mark it as stale.

For a production version, I would expose separate provider-update and backend-fetch timestamps so the UI could communicate the exact age of the data more accurately.

## 6. What did I cut to ship in 60 minutes?

I prioritized the core aggregation and reliability features over secondary product features.

I cut:

* Authentication becuase it will take lot of time 
* User accounts
* Premium billing
* Historical FX charts
* Database persistence
* Complex user dashboards
* Advanced analytics
* Full automated test coverage
* Production monitoring infrastructure

I kept:

* React frontend
* Node.js backend
* Real FX APIs
* Multiple providers
* Fallback handling
* Caching
* Conflict detection
* Stale-data handling
* Error states

These features demonstrate the main requirements of the assessment without spending the limited implementation time on features that do not improve the core aggregation service.

## 7. What would I add with more time?

With additional development time, I would add:

* Redis or another shared cache
* Rate limiting
* Automated tests
* Structured logging
* Provider latency and availability monitoring
* Circuit breakers
* More FX providers
* Historical-rate charts
* Authentication and free/paid user tiers
* Persistent user preferences
* Better freshness indicators
* Production observability and alerting

I would also move the cache from in-memory storage to shared infrastructure so that multiple backend instances could use the same cached data.

## 8. Other thoughts while building

My main design decision was to keep the React application independent from the external providers.

Instead of:


React → External FX API

I implemented:


React
  
Node.js Aggregation API
  
┌──────────────────┐
│ Frankfurter      │ ← Primary
│ ExchangeRate-API │ ← Fallback
└──────────────────┘
  ↓
Cache / degraded data
```

This gives the application one consistent backend interface and makes provider changes possible without changing the frontend.

My earlier weather application helped me understand how to consume APIs. My more recent hackathon experience helped me think beyond simply getting an API response and consider reliability, fallbacks, caching, and failure states.

The main lesson from this project is that a real-time data application should be designed for the case where the external service **does not