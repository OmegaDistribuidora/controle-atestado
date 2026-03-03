import { ExternalLink, X } from "lucide-react";
import { apiBlob } from "../services/api";
import { formatCpf } from "../services/cpf";
import { formatDate, formatDateTime } from "../services/date";

export default function DeclarationDetailsModal({ open, onClose, token, item }) {
  if (!open || !item) return null;

  async function handleOpenAttachment(filename) {
    const previewTab = window.open("", "_blank");
    if (!previewTab) {
      window.alert("O navegador bloqueou a abertura da nova aba. Libere popups para visualizar o anexo.");
      return;
    }

    previewTab.document.write("<p style=\"font-family:Arial,sans-serif;padding:12px\">Carregando anexo...</p>");

    try {
      const safeName = encodeURIComponent(filename);
      const blob = await apiBlob(`/declarations/${item.id}/attachments/${safeName}`, { token });
      const url = URL.createObjectURL(blob);
      previewTab.location.href = url;
      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (error) {
      previewTab.close();
      window.alert(error.message);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Detalhes da declaracao</h3>
          <button className="icon-btn" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="details-grid">
          <p>
            <strong>Funcionario:</strong> {item.employeeName}
          </p>
          <p>
            <strong>CPF:</strong> {formatCpf(item.cpf)}
          </p>
          <p>
            <strong>Data:</strong> {formatDate(item.declarationDate)}
          </p>
          <p>
            <strong>Horario inicial:</strong> {item.startTime}
          </p>
          <p>
            <strong>Horario final:</strong> {item.endTime}
          </p>
          <p>
            <strong>Total de horas:</strong> {item.totalHours}
          </p>
          <p>
            <strong>Registro:</strong> {formatDateTime(item.registrationDate)}
          </p>
          <p>
            <strong>Lancado por:</strong> {item.createdBy?.username || "-"}
          </p>
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
            <p className="empty-message">Sem anexos nesta declaracao.</p>
          )}
        </div>
      </div>
    </div>
  );
}
