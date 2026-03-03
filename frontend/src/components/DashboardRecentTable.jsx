import { Eye, PenLine, Trash2 } from "lucide-react";
import { formatCpf } from "../services/cpf";
import { formatDate, formatDateTime } from "../services/date";

function getTypeLabel(type) {
  return type === "DECLARATION" ? "Declaracao" : "Atestado";
}

function renderInfo(item) {
  if (item.type === "DECLARATION") {
    return `${formatDate(item.declarationDate)} | ${item.startTime}-${item.endTime} | ${item.totalHours}h`;
  }
  return `${formatDate(item.startDate)} a ${formatDate(item.endDate)} | ${item.totalDays} dias | CID: ${item.cid || "-"}`;
}

export default function DashboardRecentTable({ items, onEdit, onDetails, onDelete }) {
  if (!items.length) {
    return <p className="empty-message">Nenhum lancamento encontrado para os filtros atuais.</p>;
  }

  return (
    <div className="table-wrap dashboard-table-wrap">
      <table className="data-table dashboard-data-table">
        <thead>
          <tr>
            <th>Registro</th>
            <th>Tipo</th>
            <th>Funcionario</th>
            <th>CPF</th>
            <th>Informacoes</th>
            <th>Anexos</th>
            <th>Acoes</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={`${item.type}-${item.id}`}>
              <td>{formatDateTime(item.registrationDate)}</td>
              <td>
                <span className={`type-badge ${item.type === "DECLARATION" ? "declaration" : "certificate"}`}>
                  {getTypeLabel(item.type)}
                </span>
              </td>
              <td>{item.employeeName}</td>
              <td>{formatCpf(item.cpf)}</td>
              <td>{renderInfo(item)}</td>
              <td>{item.attachments?.length || 0}</td>
              <td>
                <div className="action-buttons">
                  <button className="icon-btn" title="Ver detalhes" onClick={() => onDetails(item)}>
                    <Eye size={14} />
                  </button>
                  <button className="icon-btn" title="Editar" onClick={() => onEdit(item)}>
                    <PenLine size={14} />
                  </button>
                  <button className="icon-btn danger-btn" title="Excluir" onClick={() => onDelete(item)}>
                    <Trash2 size={14} />
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
