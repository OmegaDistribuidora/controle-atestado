import { ExternalLink, X } from "lucide-react";
import { apiBlob } from "../services/api";
import { formatCpf } from "../services/cpf";
import { formatDate, formatDateTime } from "../services/date";

export default function CertificateDetailsModal({ open, onClose, token, item }) {
  if (!open || !item) return null;

  async function handleOpenAttachment(filename) {
    try {
      const safeName = encodeURIComponent(filename);
      const blob = await apiBlob(`/certificates/${item.id}/attachments/${safeName}`, { token });
      const url = URL.createObjectURL(blob);
      const opened = window.open(url, "_blank", "noopener,noreferrer");
      if (!opened) {
        window.location.href = url;
      }
      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (error) {
      window.alert(error.message);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Detalhes do atestado</h3>
          <button className="icon-btn" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="details-grid">
          <p><strong>Funcionário:</strong> {item.employeeName}</p>
          <p><strong>CPF:</strong> {formatCpf(item.cpf)}</p>
          <p><strong>CID:</strong> {item.cid || "-"}</p>
          <p><strong>Data inicial:</strong> {formatDate(item.startDate)}</p>
          <p><strong>Data final:</strong> {formatDate(item.endDate)}</p>
          <p><strong>Dias totais:</strong> {item.totalDays}</p>
          <p><strong>Registro:</strong> {formatDateTime(item.registrationDate)}</p>
          <p><strong>Lançado por:</strong> {item.createdBy?.username || "-"}</p>
        </div>

        <div>
          <h4>Anexos</h4>
          {item.attachments?.length ? (
            <div className="file-list details-files">
              {item.attachments.map((filename) => (
                <button
                  key={filename}
                  className="ghost-btn"
                  type="button"
                  onClick={() => handleOpenAttachment(filename)}
                >
                  <ExternalLink size={14} />
                  {filename}
                </button>
              ))}
            </div>
          ) : (
            <p className="empty-message">Sem anexos neste atestado.</p>
          )}
        </div>
      </div>
    </div>
  );
}
