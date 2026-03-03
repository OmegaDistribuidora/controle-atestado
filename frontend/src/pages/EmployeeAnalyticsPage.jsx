import { useEffect, useMemo, useState } from "react";
import { ArrowDownUp, Eye } from "lucide-react";
import EmployeeAnalyticsDetailsModal from "../components/EmployeeAnalyticsDetailsModal";
import { useAuth } from "../components/AuthProvider";
import { apiJson } from "../services/api";
import { formatCpf } from "../services/cpf";
import { formatDateTime } from "../services/date";

const TYPE_OPTIONS = [
  { value: "certificate", label: "Atestados" },
  { value: "declaration", label: "Declaracoes" },
];

function getColumns(type) {
  if (type === "declaration") {
    return [
      { key: "employeeName", label: "Colaborador" },
      { key: "cpf", label: "CPF" },
      { key: "launchesCount", label: "Qtde declaracoes" },
      { key: "totalHours", label: "Total de horas" },
      { key: "lastRegistrationDate", label: "Ultimo lancamento" },
    ];
  }

  return [
    { key: "employeeName", label: "Colaborador" },
    { key: "cpf", label: "CPF" },
    { key: "launchesCount", label: "Qtde atestados" },
    { key: "totalDays", label: "Total de dias" },
    { key: "cidsCount", label: "Qtde CIDs" },
    { key: "lastRegistrationDate", label: "Ultimo lancamento" },
  ];
}

export default function EmployeeAnalyticsPage() {
  const { token } = useAuth();
  const [type, setType] = useState("certificate");
  const [sortBy, setSortBy] = useState("totalDays");
  const [sortDir, setSortDir] = useState("desc");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedCpf, setSelectedCpf] = useState("");
  const [selectedEmployeeName, setSelectedEmployeeName] = useState("");

  const columns = useMemo(() => getColumns(type), [type]);

  useEffect(() => {
    if (type === "declaration") {
      setSortBy("totalHours");
      setSortDir("desc");
    } else {
      setSortBy("totalDays");
      setSortDir("desc");
    }
  }, [type]);

  useEffect(() => {
    setLoading(true);
    setError("");

    apiJson(`/analytics/employees?type=${type}&sortBy=${sortBy}&sortDir=${sortDir}`, { token })
      .then((payload) => setItems(payload.items || []))
      .catch((fetchError) => setError(fetchError.message))
      .finally(() => setLoading(false));
  }, [token, type, sortBy, sortDir]);

  function handleSort(columnKey) {
    if (sortBy === columnKey) {
      setSortDir((old) => (old === "asc" ? "desc" : "asc"));
      return;
    }
    setSortBy(columnKey);
    setSortDir("asc");
  }

  function renderCell(item, columnKey) {
    if (columnKey === "cpf") return formatCpf(item.cpf);
    if (columnKey === "lastRegistrationDate") return formatDateTime(item.lastRegistrationDate);
    return item[columnKey] ?? "-";
  }

  return (
    <section className="page-stack">
      <header className="page-header">
        <div>
          <h2>Analise por colaborador</h2>
          <p>Resumo tecnico por funcionario com ordenacao em qualquer coluna.</p>
        </div>

        <div className="type-switch">
          {TYPE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`ghost-btn ${
                type === option.value
                  ? `active-switch ${option.value === "certificate" ? "active-cert" : "active-decl"}`
                  : ""
              }`}
              onClick={() => setType(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </header>

      <section className="panel">
        {loading ? <p>Carregando analise...</p> : null}
        {error ? <p className="error-text">{error}</p> : null}

        {!loading && !error ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  {columns.map((column) => (
                    <th key={column.key}>
                      <button type="button" className="sort-btn" onClick={() => handleSort(column.key)}>
                        {column.label}
                        <ArrowDownUp size={13} />
                      </button>
                    </th>
                  ))}
                  <th>Acoes</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={`${item.cpf}-${item.employeeName}`}>
                    {columns.map((column) => (
                      <td key={`${item.cpf}-${item.employeeName}-${column.key}`}>{renderCell(item, column.key)}</td>
                    ))}
                    <td>
                      <button
                        className="icon-btn"
                        title="Ver ficha tecnica"
                        onClick={() => {
                          setSelectedCpf(item.cpf);
                          setSelectedEmployeeName(item.employeeName);
                          setDetailsOpen(true);
                        }}
                      >
                        <Eye size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      <EmployeeAnalyticsDetailsModal
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        token={token}
        cpf={selectedCpf}
        employeeName={selectedEmployeeName}
        type={type}
      />
    </section>
  );
}
