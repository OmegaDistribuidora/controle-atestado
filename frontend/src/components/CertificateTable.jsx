import { Eye, PenLine, Trash2 } from "lucide-react";
import { formatDate, formatDateTime } from "../services/date";

export default function CertificateTable({ items, onEdit, onDetails, onDelete }) {
  if (!items.length) {
    return <p className="empty-message">Nenhum atestado encontrado para os filtros atuais.</p>;
  }

  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Registro</th>
            <th>Funcionário</th>
            <th>CPF</th>
            <th>CID</th>
            <th>Início</th>
            <th>Fim</th>
            <th>Dias</th>
            <th>Anexos</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>{formatDateTime(item.registrationDate)}</td>
              <td>{item.employeeName}</td>
              <td>{item.cpf}</td>
              <td>{item.cid || "-"}</td>
              <td>{formatDate(item.startDate)}</td>
              <td>{formatDate(item.endDate)}</td>
              <td>{item.totalDays}</td>
              <td>{item.attachments?.length || 0}</td>
              <td>
                <div className="action-buttons">
                  <button className="icon-btn" title="Ver detalhes" onClick={() => onDetails(item)}>
                    <Eye size={16} />
                  </button>
                  <button className="icon-btn" title="Editar atestado" onClick={() => onEdit(item)}>
                    <PenLine size={16} />
                  </button>
                  <button className="icon-btn danger-btn" title="Excluir atestado" onClick={() => onDelete(item)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
