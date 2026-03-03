import { useEffect, useMemo, useState } from "react";
import { Eye, X } from "lucide-react";
import { apiBlob, apiJson } from "../services/api";
import { formatCpf } from "../services/cpf";
import { formatDate, formatDateTime } from "../services/date";

export default function EmployeeAnalyticsDetailsModal({ open, onClose, token, cpf, employeeName, type }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [payload, setPayload] = useState(null);

  useEffect(() => {
    if (!open || !cpf) return;

    setLoading(true);
    setError("");
    setPayload(null);

    const query = new URLSearchParams({ type });
    if (employeeName) query.set("employeeName", employeeName);

    apiJson(`/analytics/employees/${cpf}/details?${query.toString()}`, { token })
      .then((response) => setPayload(response))
      .catch((fetchError) => setError(fetchError.message))
      .finally(() => setLoading(false));
  }, [open, cpf, employeeName, type, token]);

  const summary = payload?.summary || null;
  const items = payload?.items || [];
  const isDeclaration = type === "declaration";

  const detailTitle = useMemo(
    () => (isDeclaration ? "Ficha tecnica de declaracoes" : "Ficha tecnica de atestados"),
    [isDeclaration]
  );

  async function handleOpenAttachment(item) {
    if (!item.firstAttachment) return;

    const previewTab = window.open("", "_blank");
    if (!previewTab) {
      window.alert("O navegador bloqueou a abertura da nova aba. Libere popups para visualizar o anexo.");
      return;
    }

    previewTab.document.write("<p style=\"font-family:Arial,sans-serif;padding:12px\">Carregando anexo...</p>");

    try {
      const safeName = encodeURIComponent(item.firstAttachment);
      const path = isDeclaration
        ? `/declarations/${item.id}/attachments/${safeName}`
        : `/certificates/${item.id}/attachments/${safeName}`;
      const blob = await apiBlob(path, { token });
      const url = URL.createObjectURL(blob);
      previewTab.location.href = url;
      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (error) {
      previewTab.close();
      window.alert(error.message);
    }
  }

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card large-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{detailTitle}</h3>
          <button className="icon-btn" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {loading ? <p>Carregando dados do colaborador...</p> : null}
        {error ? <p className="error-text">{error}</p> : null}

        {!loading && !error && summary ? (
          <>
            <div className="employee-summary">
              <p>
                <strong>Colaborador:</strong> {summary.employeeName}
              </p>
              <p>
                <strong>CPF:</strong> {formatCpf(summary.cpf)}
              </p>
              <p>
                <strong>Lancamentos:</strong> {summary.launchesCount}
              </p>
              <p>
                <strong>{isDeclaration ? "Total de horas" : "Total de dias"}:</strong>{" "}
                {isDeclaration ? summary.totalHours : summary.totalDays}
              </p>
              <p>
                <strong>Primeiro registro:</strong> {formatDateTime(summary.firstRegistrationDate)}
              </p>
              <p>
                <strong>Ultimo registro:</strong> {formatDateTime(summary.lastRegistrationDate)}
              </p>
              {!isDeclaration && (
                <p className="employee-summary-cids">
                  <strong>Todos os CIDs:</strong> {summary.cids?.length ? summary.cids.join(", ") : "-"}
                </p>
              )}
            </div>

            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Registro</th>
                    {isDeclaration ? <th>Data</th> : <th>Periodo</th>}
                    {isDeclaration ? <th>Horarios</th> : <th>CID</th>}
                    <th>{isDeclaration ? "Horas" : "Dias"}</th>
                    <th>Anexo</th>
                    <th>Lancado por</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td>{formatDateTime(item.registrationDate)}</td>
                      {isDeclaration ? (
                        <td>{formatDate(item.declarationDate)}</td>
                      ) : (
                        <td>
                          {formatDate(item.startDate)} a {formatDate(item.endDate)}
                        </td>
                      )}
                      {isDeclaration ? (
                        <td>
                          {item.startTime}-{item.endTime}
                        </td>
                      ) : (
                        <td>{item.cid}</td>
                      )}
                      <td>{isDeclaration ? item.totalHours : item.totalDays}</td>
                      <td>
                        {item.firstAttachment ? (
                          <button
                            className="icon-btn"
                            title="Ver anexo"
                            onClick={() => handleOpenAttachment(item)}
                          >
                            <Eye size={14} />
                          </button>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td>{item.launchedBy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
