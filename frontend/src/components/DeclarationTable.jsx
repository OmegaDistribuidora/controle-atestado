import { Eye, PenLine, Trash2 } from "lucide-react";
import { formatCpf } from "../services/cpf";
import { formatDate, formatDateTime } from "../services/date";

export default function DeclarationTable({ items, onEdit, onDetails, onDelete }) {
  if (!items.length) {
    return <p className="empty-message">Nenhuma declaracao encontrada para os filtros atuais.</p>;
  }

  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Registro</th>
            <th>Funcionario</th>
            <th>CPF</th>
            <th>Data</th>
            <th>Hora inicial</th>
            <th>Hora final</th>
            <th>Total horas</th>
            <th>Anexos</th>
            <th>Acoes</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>{formatDateTime(item.registrationDate)}</td>
              <td>{item.employeeName}</td>
              <td>{formatCpf(item.cpf)}</td>
              <td>{formatDate(item.declarationDate)}</td>
              <td>{item.startTime}</td>
              <td>{item.endTime}</td>
              <td>{item.totalHours}</td>
              <td>{item.attachments?.length || 0}</td>
              <td>
                <div className="action-buttons">
                  <button className="icon-btn" title="Ver detalhes" onClick={() => onDetails(item)}>
                    <Eye size={14} />
                  </button>
                  <button className="icon-btn" title="Editar declaracao" onClick={() => onEdit(item)}>
                    <PenLine size={14} />
                  </button>
                  <button className="icon-btn danger-btn" title="Excluir declaracao" onClick={() => onDelete(item)}>
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
