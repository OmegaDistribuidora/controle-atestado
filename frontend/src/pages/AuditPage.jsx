import { Eye } from "lucide-react";
import { useEffect, useState } from "react";
import AuditDetailsModal from "../components/AuditDetailsModal";
import { useAuth } from "../components/AuthProvider";
import { buildQuery, apiJson } from "../services/api";
import { formatCpf } from "../services/cpf";
import { formatDateTime } from "../services/date";

const ACTION_LABELS = {
  CREATE: "Adicao",
  UPDATE: "Edicao",
  DELETE: "Remocao",
};

const TYPE_LABELS = {
  CERTIFICATE: "Atestado",
  DECLARATION: "Declaracao",
};

const DEFAULT_FILTERS = {
  search: "",
  action: "",
  entityType: "",
};

export default function AuditPage() {
  const { token, user } = useAuth();
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(DEFAULT_FILTERS);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsItem, setDetailsItem] = useState(null);

  useEffect(() => {
    if (user?.role !== "ADMIN") return;

    setLoading(true);
    setError("");

    const query = buildQuery({
      page,
      limit,
      search: appliedFilters.search,
      action: appliedFilters.action,
      entityType: appliedFilters.entityType,
    });

    apiJson(`/audit${query}`, { token })
      .then((payload) => {
        setItems(payload.items || []);
        setTotal(payload.total || 0);
      })
      .catch((fetchError) => setError(fetchError.message))
      .finally(() => setLoading(false));
  }, [token, user?.role, page, limit, appliedFilters]);

  if (user?.role !== "ADMIN") {
    return (
      <section className="page-stack">
        <h2>Auditoria</h2>
        <p className="error-text">Somente administradores podem acessar esta pagina.</p>
      </section>
    );
  }

  const totalPages = Math.max(Math.ceil(total / limit), 1);

  async function handleOpenDetails(logId) {
    setDetailsOpen(true);
    setDetailsLoading(true);
    setDetailsItem(null);

    try {
      const payload = await apiJson(`/audit/${logId}`, { token });
      setDetailsItem(payload.item || null);
    } catch (fetchError) {
      setError(fetchError.message);
      setDetailsOpen(false);
    } finally {
      setDetailsLoading(false);
    }
  }

  return (
    <section className="page-stack">
      <header className="page-header">
        <div>
          <h2>Auditoria</h2>
          <p>Historico completo de adicao, edicao e remocao de atestados e declaracoes.</p>
        </div>
      </header>

      <section className="panel">
        <div className="filter-grid">
          <label>
            Buscar por colaborador / CPF / usuario
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters((old) => ({ ...old, search: e.target.value }))}
              placeholder="Ex: carlos, 10206148461, rh"
            />
          </label>
          <label>
            Acao
            <select
              value={filters.action}
              onChange={(e) => setFilters((old) => ({ ...old, action: e.target.value }))}
            >
              <option value="">Todas</option>
              <option value="CREATE">Adicao</option>
              <option value="UPDATE">Edicao</option>
              <option value="DELETE">Remocao</option>
            </select>
          </label>
          <label>
            Tipo
            <select
              value={filters.entityType}
              onChange={(e) => setFilters((old) => ({ ...old, entityType: e.target.value }))}
            >
              <option value="">Todos</option>
              <option value="CERTIFICATE">Atestado</option>
              <option value="DECLARATION">Declaracao</option>
            </select>
          </label>
        </div>

        <div className="filter-actions">
          <button
            className="primary-btn"
            onClick={() => {
              setAppliedFilters({ ...filters });
              setPage(1);
            }}
          >
            Aplicar filtros
          </button>
          <button
            className="ghost-btn"
            onClick={() => {
              setFilters(DEFAULT_FILTERS);
              setAppliedFilters(DEFAULT_FILTERS);
              setPage(1);
            }}
          >
            Limpar
          </button>
        </div>

        {loading ? (
          <p>Carregando...</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Acao</th>
                  <th>Tipo</th>
                  <th>Usuario</th>
                  <th>Data e hora</th>
                  <th>Colaborador</th>
                  <th>Acoes</th>
                </tr>
              </thead>
              <tbody>
                {items.length ? (
                  items.map((item) => (
                    <tr key={item.id}>
                      <td>{ACTION_LABELS[item.action] || item.action}</td>
                      <td>{TYPE_LABELS[item.entityType] || item.entityType}</td>
                      <td>{item.performedBy?.username || "-"}</td>
                      <td>{formatDateTime(item.createdAt)}</td>
                      <td>
                        {item.employeeName || "-"} ({formatCpf(item.cpf)})
                      </td>
                      <td>
                        <button className="icon-btn" onClick={() => handleOpenDetails(item.id)}>
                          <Eye size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="empty-message">
                      Nenhum registro encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="pagination-row">
          <span>
            Pagina {page} de {totalPages} | Total: {total} registros
          </span>
          <div className="pagination-actions">
            <button className="ghost-btn" disabled={page <= 1} onClick={() => setPage((old) => old - 1)}>
              Anterior
            </button>
            <button className="ghost-btn" disabled={page >= totalPages} onClick={() => setPage((old) => old + 1)}>
              Proxima
            </button>
          </div>
        </div>
      </section>

      {error && <p className="error-text">{error}</p>}

      <AuditDetailsModal
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        loading={detailsLoading}
        item={detailsItem}
      />
    </section>
  );
}
