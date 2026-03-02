import { useEffect, useState } from "react";
import CertificateDetailsModal from "../components/CertificateDetailsModal";
import CertificateFormModal from "../components/CertificateFormModal";
import CertificateTable from "../components/CertificateTable";
import FilterBar from "../components/FilterBar";
import { useAuth } from "../components/AuthProvider";
import { apiJson } from "../services/api";

const DEFAULT_FILTERS = {
  search: "",
  totalDays: "",
  period: "",
  customFrom: "",
  customTo: "",
};

export default function CertificatesPage() {
  const { token } = useAuth();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(DEFAULT_FILTERS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsItem, setDetailsItem] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const query = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });

    Object.entries(appliedFilters).forEach(([key, value]) => {
      if (value) query.set(key, value);
    });

    setLoading(true);
    setError("");
    apiJson(`/certificates?${query.toString()}`, { token })
      .then((payload) => {
        setItems(payload.items || []);
        setTotal(payload.total || 0);
      })
      .catch((fetchError) => setError(fetchError.message))
      .finally(() => setLoading(false));
  }, [token, page, limit, appliedFilters, refreshKey]);

  const totalPages = Math.max(Math.ceil(total / limit), 1);

  function handleSaved() {
    setRefreshKey((old) => old + 1);
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
          <h2>Todos os atestados</h2>
          <p>Consulta completa com filtros e edição de registros.</p>
        </div>
        <button
          className="primary-btn"
          onClick={() => {
            setEditingItem(null);
            setModalOpen(true);
          }}
        >
          Novo atestado
        </button>
      </header>

      <section className="panel">
        <FilterBar
          filters={filters}
          setFilters={setFilters}
          onApply={() => {
            setAppliedFilters({ ...filters });
            setPage(1);
          }}
          onReset={() => {
            setFilters(DEFAULT_FILTERS);
            setAppliedFilters(DEFAULT_FILTERS);
            setPage(1);
          }}
        />

        {loading ? (
          <p>Carregando...</p>
        ) : (
          <CertificateTable
            items={items}
            onEdit={(item) => {
              setEditingItem(item);
              setModalOpen(true);
            }}
            onDetails={(item) => {
              setDetailsItem(item);
              setDetailsOpen(true);
            }}
            onDelete={handleDelete}
          />
        )}

        <div className="pagination-row">
          <span>
            Página {page} de {totalPages} | Total: {total} registros
          </span>
          <div className="pagination-actions">
            <button className="ghost-btn" disabled={page <= 1} onClick={() => setPage((old) => old - 1)}>
              Anterior
            </button>
            <button className="ghost-btn" disabled={page >= totalPages} onClick={() => setPage((old) => old + 1)}>
              Próxima
            </button>
          </div>
        </div>
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
