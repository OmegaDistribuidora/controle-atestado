import { useEffect, useState } from "react";
import YearCalendar from "../components/YearCalendar";
import { useAuth } from "../components/AuthProvider";
import { apiJson } from "../services/api";

export default function AnalyticsPage() {
  const { token } = useAuth();
  const [year, setYear] = useState(new Date().getFullYear());
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");

    apiJson(`/analytics/yearly?year=${year}`, { token })
      .then((payload) => setCounts(payload.counts || {}))
      .catch((fetchError) => setError(fetchError.message))
      .finally(() => setLoading(false));
  }, [token, year]);

  return (
    <section className="page-stack">
      <header className="page-header">
        <div>
          <h2>Painel de análises</h2>
          <p>Calendário anual com destaque em laranja para dias com afastados.</p>
        </div>

        <label className="inline-field">
          Ano
          <input type="number" min="2000" max="2100" value={year} onChange={(e) => setYear(Number(e.target.value))} />
        </label>
      </header>

      <section className="panel">
        {loading ? <p>Carregando análise...</p> : <YearCalendar year={year} counts={counts} />}
      </section>

      {error && <p className="error-text">{error}</p>}
    </section>
  );
}
