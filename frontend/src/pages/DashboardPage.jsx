import { useEffect, useMemo, useState } from "react";
import CertificateDetailsModal from "../components/CertificateDetailsModal";
import CertificateFormModal from "../components/CertificateFormModal";
import CertificateTable from "../components/CertificateTable";
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
  const [summary, setSummary] = useState({ totalCertificates: 0, totalDays: 0, activeEmployeesToday: 0 });
  const [items, setItems] = useState([]);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(DEFAULT_FILTERS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsItem, setDetailsItem] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const todayLabel = useMemo(() => getTodayFortalezaLabel(), []);

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

  function openCreateModal() {
    setEditingItem(null);
    setModalOpen(true);
  }

  function openEditModal(item) {
    setEditingItem(item);
    setModalOpen(true);
  }

  function handleSaved() {
    setRefreshKey((old) => old + 1);
  }

  function openDetailsModal(item) {
    setDetailsItem(item);
    setDetailsOpen(true);
  }

  async function handleDelete(item) {
    const confirmed = window.confirm(`Deseja excluir o atestado de ${item.employeeName}?`);
    if (!confirmed) return;

    try {
      await apiJson(`/certificates/${item.id}`, { token, method: "DELETE" });
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
            Bem-vindo, <strong>{user?.username}</strong>. Hoje é {todayLabel}.
          </p>
        </div>
        <button className="primary-btn" onClick={openCreateModal}>
          Novo atestado
        </button>
      </header>

      <section className="kpi-grid">
        <KpiCard label="Total de atestados" value={summary.totalCertificates} />
        <KpiCard label="Total de dias de atestado" value={summary.totalDays} />
        <KpiCard label="Funcionários afastados hoje" value={summary.activeEmployeesToday} />
      </section>

      <section className="panel">
        <h3>Últimos 20 lançamentos</h3>
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
          <CertificateTable items={items} onEdit={openEditModal} onDetails={openDetailsModal} onDelete={handleDelete} />
        )}
      </section>

      {error && <p className="error-text">{error}</p>}

      <CertificateFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        token={token}
        initialData={editingItem}
        onSaved={handleSaved}
      />
      <CertificateDetailsModal
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        token={token}
        item={detailsItem}
      />
    </section>
  );
}
