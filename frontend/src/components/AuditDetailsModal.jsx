import { X } from "lucide-react";
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

const FIELD_LABELS = {
  employeeName: "Funcionario",
  cpf: "CPF",
  startDate: "Data inicial",
  endDate: "Data final",
  cid: "CID",
  totalDays: "Dias totais",
  declarationDate: "Data",
  startTime: "Horario inicial",
  endTime: "Horario final",
  totalHours: "Total de horas",
  attachments: "Anexos",
};

function formatDateOnly(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ""));
  if (!match) return String(value || "-");
  return `${match[3]}/${match[2]}/${match[1]}`;
}

function formatFieldValue(field, value) {
  if (value === null || value === undefined || value === "") return "-";

  if (field === "cpf") return formatCpf(value);
  if (field === "startDate" || field === "endDate" || field === "declarationDate") return formatDateOnly(value);
  if (field === "totalHours") {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return "-";
    return `${parsed.toFixed(2)}h`;
  }

  return String(value);
}

function getSnapshotRows(item) {
  const source = item.action === "DELETE" ? item.beforeData || {} : item.afterData || {};
  const preferredFields =
    item.entityType === "DECLARATION"
      ? ["employeeName", "cpf", "declarationDate", "startTime", "endTime", "totalHours", "attachments"]
      : ["employeeName", "cpf", "startDate", "endDate", "cid", "totalDays", "attachments"];

  return preferredFields
    .filter((field) => source[field] !== undefined)
    .map((field) => ({
      field,
      label: FIELD_LABELS[field] || field,
      value: formatFieldValue(field, source[field]),
    }));
}

export default function AuditDetailsModal({ open, onClose, item, loading }) {
  if (!open) return null;

  const snapshotRows = item ? getSnapshotRows(item) : [];
  const changes = Array.isArray(item?.changes) ? item.changes : [];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card large-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Detalhes da auditoria</h3>
          <button className="icon-btn" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {loading ? (
          <p>Carregando detalhes...</p>
        ) : item ? (
          <>
            <div className="audit-summary-grid">
              <p>
                <strong>Acao:</strong> {ACTION_LABELS[item.action] || item.action}
              </p>
              <p>
                <strong>Tipo:</strong> {TYPE_LABELS[item.entityType] || item.entityType}
              </p>
              <p>
                <strong>Usuario:</strong> {item.performedBy?.username || "-"}
              </p>
              <p>
                <strong>Data e hora:</strong> {formatDateTime(item.createdAt)}
              </p>
              <p>
                <strong>Colaborador:</strong> {item.employeeName || "-"}
              </p>
              <p>
                <strong>CPF:</strong> {formatCpf(item.cpf)}
              </p>
            </div>

            {item.action === "UPDATE" ? (
              <div className="audit-change-list">
                {changes.length ? (
                  changes.map((change, index) => (
                    <article key={`${change.field}-${index}`} className="audit-change-card">
                      <h4>{change.label || FIELD_LABELS[change.field] || change.field}</h4>
                      <p>
                        <strong>De:</strong> {formatFieldValue(change.field, change.before)}
                      </p>
                      <p>
                        <strong>Para:</strong> {formatFieldValue(change.field, change.after)}
                      </p>
                    </article>
                  ))
                ) : (
                  <p className="empty-message">Nao houve diferenca entre os valores.</p>
                )}
              </div>
            ) : (
              <div className="audit-snapshot-grid">
                {snapshotRows.map((row) => (
                  <article key={row.field} className="audit-change-card">
                    <h4>{row.label}</h4>
                    <p>{row.value}</p>
                  </article>
                ))}
              </div>
            )}
          </>
        ) : (
          <p className="empty-message">Nao foi possivel carregar os detalhes.</p>
        )}
      </div>
    </div>
  );
}
