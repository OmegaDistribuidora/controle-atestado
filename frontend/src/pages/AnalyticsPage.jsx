import { useEffect, useState } from "react";
import YearCalendar from "../components/YearCalendar";
import { useAuth } from "../components/AuthProvider";
import { apiJson } from "../services/api";

export default function AnalyticsPage() {
  const { token } = useAuth();
  const [year, setYear] = useState(new Date().getFullYear());
  const [certificateCounts, setCertificateCounts] = useState({});
  const [declarationCounts, setDeclarationCounts] = useState({});
  const [maxTotalCount, setMaxTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");

    apiJson(`/analytics/yearly?year=${year}`, { token })
      .then((payload) => {
        setCertificateCounts(payload.certificateCounts || {});
        setDeclarationCounts(payload.declarationCounts || {});
        setMaxTotalCount(payload.maxTotalCount || 0);
      })
      .catch((fetchError) => setError(fetchError.message))
      .finally(() => setLoading(false));
  }, [token, year]);

  return (
    <section className="page-stack">
      <header className="page-header">
        <div>
          <h2>Analise anual</h2>
          <p>Calendario anual com atestados e declaracoes em cores diferentes.</p>
        </div>

        <label className="inline-field">
          Ano
          <input type="number" min="2000" max="2100" value={year} onChange={(e) => setYear(Number(e.target.value))} />
        </label>
      </header>

      <section className="panel">
        <div className="analytics-legend">
          <span className="legend-item">
            <i className="legend-dot cert" />
            Atestados
          </span>
          <span className="legend-item">
            <i className="legend-dot decl" />
            Declaracoes
          </span>
        </div>

        {loading ? (
          <p>Carregando analise...</p>
        ) : (
          <YearCalendar
            year={year}
            certificateCounts={certificateCounts}
            declarationCounts={declarationCounts}
            maxTotalCount={maxTotalCount}
          />
        )}
      </section>

      {error && <p className="error-text">{error}</p>}
    </section>
  );
}
