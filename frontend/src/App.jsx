import { useEffect, useState } from "react";
import "./App.css";

const currencies = ["EUR", "GBP", "INR", "JPY", "AUD", "CAD", "CHF", "SGD"];

function App() {
  const [base, setBase] = useState("USD");
  const [rates, setRates] = useState({});
  const [source, setSource] = useState("");
  const [date, setDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [stale, setStale] = useState(false);
  const [warnings, setWarnings] = useState([]);

  async function loadRates() {
    setLoading(true);
    setError("");

    try {
      const symbols = currencies.filter(
        (currency) => currency !== base
      );

    const response = await fetch(
  `https://cactro-7h0b.onrender.com/api/rates?base=${base}&symbols=${symbols.join(",")}`
);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Unable to load exchange rates"
        );
      }

      setRates(data.rates || {});
      setSource(data.source || "");
      setDate(data.date || "");
      setStale(Boolean(data.stale));
      setWarnings(data.warnings || []);
    } catch (err) {
      setError(err.message);
      setRates({});
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRates();
  }, [base]);

  return (
    <main className="app">
      <section className="dashboard">
        <div className="header">
          <div>
            <p className="eyebrow">REAL-TIME DATA</p>
            <h1>FX Tracker</h1>
            <p className="subtitle">
              Reliable exchange rates with provider fallback.
            </p>
          </div>

          <button
            className="refresh-button"
            onClick={loadRates}
            disabled={loading}
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        <div className="controls">
          <label htmlFor="base-currency">
            Base currency
          </label>

          <select
            id="base-currency"
            value={base}
            onChange={(event) =>
              setBase(event.target.value)
            }
          >
            <option value="USD">USD — US Dollar</option>
            <option value="EUR">EUR — Euro</option>
            <option value="GBP">GBP — British Pound</option>
            <option value="INR">INR — Indian Rupee</option>
          </select>
        </div>

        {error && (
          <div className="message error">
            <strong>Data unavailable</strong>
            <span>{error}</span>
          </div>
        )}

        {!error && (
          <>
            <div className="status-row">
              <div className="status">
                <span className="status-dot"></span>
                {stale ? "Showing cached data" : "Data available"}
              </div>

              <div className="source">
                Source: {source}
              </div>
            </div>

            {warnings.length > 0 && (
              <div className="message warning">
                {warnings.map((warning, index) => (
                  <span key={index}>{warning}</span>
                ))}
              </div>
            )}

            <div className="rates-grid">
              {currencies
                .filter((currency) => currency !== base)
                .map((currency) => (
                  <article className="rate-card" key={currency}>
                    <span className="currency">
                      {currency}
                    </span>

                    <strong>
                      {rates[currency]
                        ? Number(rates[currency]).toFixed(4)
                        : "—"}
                    </strong>

                    <small>
                      1 {base} = {rates[currency]
                        ? Number(rates[currency]).toFixed(4)
                        : "—"}{" "}
                      {currency}
                    </small>
                  </article>
                ))}
            </div>

            {date && (
              <p className="updated">
                Provider reference date: {date}
              </p>
            )}
          </>
        )}
      </section>
    </main>
  );
}

export default App;