import { useEffect, useMemo, useState } from "react";
import CertificateDetailsModal from "../components/CertificateDetailsModal";
import CertificateFormModal from "../components/CertificateFormModal";
import DashboardRecentTable from "../components/DashboardRecentTable";
import DeclarationDetailsModal from "../components/DeclarationDetailsModal";
import DeclarationFormModal from "../components/DeclarationFormModal";
import FilterBar from "../components/FilterBar";
import KpiCard from "../components/KpiCard";
import { useAuth } from "../components/AuthProvider";
import { apiJson } from "../services/api";
import { getTodayFortalezaLabel } from "../services/date";

const DEFAULT_FILTERS = {
  search: "",
  totalDays: "",
  period: "",
  customFrom: "",
  customTo: "",
};

export default function DashboardPage() {
  const { token, user } = useAuth();
  const [summary, setSummary] = useState({
    totalCertificates: 0,
    totalDeclarations: 0,
    totalDays: 0,
    totalDeclarationHours: 0,
    activeEmployeesToday: 0,
    declarationsToday: 0,
  });
  const [items, setItems] = useState([]);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(DEFAULT_FILTERS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [certificateModalOpen, setCertificateModalOpen] = useState(false);
  const [editingCertificate, setEditingCertificate] = useState(null);
  const [certificateDetailsOpen, setCertificateDetailsOpen] = useState(false);
  const [certificateDetailsItem, setCertificateDetailsItem] = useState(null);

  const [declarationModalOpen, setDeclarationModalOpen] = useState(false);
  const [editingDeclaration, setEditingDeclaration] = useState(null);
  const [declarationDetailsOpen, setDeclarationDetailsOpen] = useState(false);
  const [declarationDetailsItem, setDeclarationDetailsItem] = useState(null);

  const [refreshKey, setRefreshKey] = useState(0);

  const todayLabel = useMemo(() => getTodayFortalezaLabel(), []);
  const avgDaysPerCertificate = useMemo(() => {
    if (!summary.totalCertificates) return 0;
    return Number((summary.totalDays / summary.totalCertificates).toFixed(2));
  }, [summary.totalCertificates, summary.totalDays]);

  const avgHoursPerDeclaration = useMemo(() => {
    if (!summary.totalDeclarations) return 0;
    return Number((summary.totalDeclarationHours / summary.totalDeclarations).toFixed(2));
  }, [summary.totalDeclarations, summary.totalDeclarationHours]);

  useEffect(() => {
    apiJson("/dashboard/summary", { token })
      .then((payload) => setSummary(payload))
      .catch((fetchError) => setError(fetchError.message));
  }, [token, refreshKey]);

  useEffect(() => {
    const query = new URLSearchParams();
    Object.entries(appliedFilters).forEach(([key, value]) => {
      if (value) query.set(key, value);
    });

    setLoading(true);
    setError("");
    apiJson(`/dashboard/recent?${query.toString()}`, { token })
      .then((payload) => setItems(payload.items || []))
      .catch((fetchError) => setError(fetchError.message))
      .finally(() => setLoading(false));
  }, [token, appliedFilters, refreshKey]);

  function handleSaved() {
    setRefreshKey((old) => old + 1);
  }

  function handleEdit(item) {
    if (item.type === "DECLARATION") {
      setEditingDeclaration(item);
      setDeclarationModalOpen(true);
      return;
    }
    setEditingCertificate(item);
    setCertificateModalOpen(true);
  }

  function handleDetails(item) {
    if (item.type === "DECLARATION") {
      setDeclarationDetailsItem(item);
      setDeclarationDetailsOpen(true);
      return;
    }
    setCertificateDetailsItem(item);
    setCertificateDetailsOpen(true);
  }

  async function handleDelete(item) {
    const label = item.type === "DECLARATION" ? "declaracao" : "atestado";
    const confirmed = window.confirm(`Deseja excluir o ${label} de ${item.employeeName}?`);
    if (!confirmed) return;

    const path = item.type === "DECLARATION" ? `/declarations/${item.id}` : `/certificates/${item.id}`;

    try {
      await apiJson(path, { token, method: "DELETE" });
      setRefreshKey((old) => old + 1);
    } catch (deleteError) {
      setError(deleteError.message);
    }
  }

  return (
    <section className="page-stack">
      <header className="page-header">
        <div>
          <h2>Dashboard principal</h2>
          <p>
            Bem-vindo, <strong>{user?.username}</strong>. Hoje e {todayLabel}.
          </p>
        </div>
        <div className="header-actions">
          <button
            className="primary-btn action-cert-btn"
            onClick={() => {
              setEditingCertificate(null);
              setCertificateModalOpen(true);
            }}
          >
            Novo atestado
          </button>
          <button
            className="primary-btn action-decl-btn"
            onClick={() => {
              setEditingDeclaration(null);
              setDeclarationModalOpen(true);
            }}
          >
            Nova declaracao
          </button>
        </div>
      </header>

      <section className="kpi-block">
        <div className="kpi-grid kpi-grid-expanded">
          <KpiCard label="Total de atestados" value={summary.totalCertificates} />
          <KpiCard label="Total de dias de atestado" value={summary.totalDays} />
          <KpiCard label="Funcionarios afastados hoje" value={summary.activeEmployeesToday} />
          <KpiCard label="Media de dias por atestado" value={avgDaysPerCertificate} />
        </div>
      </section>

      <section className="kpi-block">
        <div className="kpi-grid kpi-grid-expanded">
          <KpiCard label="Total de declaracoes" value={summary.totalDeclarations} />
          <KpiCard label="Total de horas de declaracoes" value={summary.totalDeclarationHours} />
          <KpiCard label="Declaracoes hoje" value={summary.declarationsToday} />
          <KpiCard label="Media de horas por declaracao" value={avgHoursPerDeclaration} />
        </div>
      </section>

      <section className="panel">
        <h3>Ultimos 20 lancamentos</h3>
        <FilterBar
          filters={filters}
          setFilters={setFilters}
          onApply={() => setAppliedFilters({ ...filters })}
          onReset={() => {
            setFilters(DEFAULT_FILTERS);
            setAppliedFilters(DEFAULT_FILTERS);
          }}
        />

        {loading ? (
          <p>Carregando...</p>
        ) : (
          <DashboardRecentTable items={items} onEdit={handleEdit} onDetails={handleDetails} onDelete={handleDelete} />
        )}
      </section>

      {error && <p className="error-text">{error}</p>}

      <CertificateFormModal
        open={certificateModalOpen}
        onClose={() => setCertificateModalOpen(false)}
        token={token}
        initialData={editingCertificate}
        onSaved={handleSaved}
      />
      <CertificateDetailsModal
        open={certificateDetailsOpen}
        onClose={() => setCertificateDetailsOpen(false)}
        token={token}
        item={certificateDetailsItem}
      />
      <DeclarationFormModal
        open={declarationModalOpen}
        onClose={() => setDeclarationModalOpen(false)}
        token={token}
        initialData={editingDeclaration}
        onSaved={handleSaved}
      />
      <DeclarationDetailsModal
        open={declarationDetailsOpen}
        onClose={() => setDeclarationDetailsOpen(false)}
        token={token}
        item={declarationDetailsItem}
      />
    </section>
  );
}
