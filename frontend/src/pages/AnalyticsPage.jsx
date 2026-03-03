import { useEffect, useState } from "react";
import YearCalendar from "../components/YearCalendar";
import { useAuth } from "../components/AuthProvider";
import { apiJson } from "../services/api";
import { formatCpf } from "../services/cpf";

export default function AnalyticsPage() {
  const { token } = useAuth();
  const [year, setYear] = useState(new Date().getFullYear());
  const [viewMode, setViewMode] = useState("certificate");
  const [collaborators, setCollaborators] = useState([]);
  const [selectedCollaboratorKey, setSelectedCollaboratorKey] = useState("ALL");
  const [certificateCounts, setCertificateCounts] = useState({});
  const [declarationCounts, setDeclarationCounts] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    apiJson("/analytics/collaborators", { token })
      .then((payload) => {
        const options = (payload.items || []).map((item) => ({
          key: item.key,
          cpf: item.cpf,
          employeeName: item.employeeName,
          label: `${item.employeeName} (${formatCpf(item.cpf)})`,
        }));
        setCollaborators(options);
      })
      .catch(() => setCollaborators([]));
  }, [token]);

  useEffect(() => {
    setLoading(true);
    setError("");

    const query = new URLSearchParams({ year: String(year) });
    if (selectedCollaboratorKey !== "ALL") {
      const selected = collaborators.find((item) => item.key === selectedCollaboratorKey);
      if (selected) {
        query.set("cpf", selected.cpf);
        query.set("employeeName", selected.employeeName);
      }
    }

    apiJson(`/analytics/yearly?${query.toString()}`, { token })
      .then((payload) => {
        setCertificateCounts(payload.certificateCounts || {});
        setDeclarationCounts(payload.declarationCounts || {});
      })
      .catch((fetchError) => setError(fetchError.message))
      .finally(() => setLoading(false));
  }, [token, year, selectedCollaboratorKey, collaborators]);

  return (
    <section className="page-stack">
      <header className="page-header">
        <div>
          <h2>Analise anual</h2>
          <p>Calendario anual com atestados e declaracoes em cores diferentes.</p>
        </div>
      </header>

      <section className="panel">
        <div className="analytics-toolbar">
          <div className="analytics-toolbar-left">
            <div className="analytics-toggle">
              <button
                type="button"
                className={`ghost-btn annual-mode-btn ${viewMode === "certificate" ? "annual-active" : ""}`}
                onClick={() => setViewMode("certificate")}
              >
                Atestados
              </button>
              <button
                type="button"
                className={`ghost-btn annual-mode-btn ${viewMode === "declaration" ? "annual-active" : ""}`}
                onClick={() => setViewMode("declaration")}
              >
                Declaracoes
              </button>
            </div>

            <label className="analytics-collab-field">
              Colaborador
              <select value={selectedCollaboratorKey} onChange={(e) => setSelectedCollaboratorKey(e.target.value)}>
                <option value="ALL">TODOS</option>
                {collaborators.map((item) => (
                  <option key={item.key} value={item.key}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="inline-field analytics-year-field">
            Ano
            <input
              type="number"
              min="2000"
              max="2100"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            />
          </label>
        </div>

        {loading ? (
          <p>Carregando analise...</p>
        ) : (
          <YearCalendar
            year={year}
            viewMode={viewMode}
            certificateCounts={certificateCounts}
            declarationCounts={declarationCounts}
          />
        )}
      </section>

      {error && <p className="error-text">{error}</p>}
    </section>
  );
}
