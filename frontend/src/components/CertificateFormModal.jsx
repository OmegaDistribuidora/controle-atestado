import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { apiForm } from "../services/api";
import { calculateAfastamentoInfo } from "../services/date";

const INITIAL_STATE = {
  employeeName: "",
  cpf: "",
  startDate: "",
  endDate: "",
  cid: "",
};

function toInputDate(dateValue) {
  if (!dateValue) return "";
  return new Date(dateValue).toISOString().slice(0, 10);
}

export default function CertificateFormModal({ open, onClose, token, initialData, onSaved }) {
  const isEditing = Boolean(initialData?.id);
  const [form, setForm] = useState(INITIAL_STATE);
  const [existingAttachments, setExistingAttachments] = useState([]);
  const [newFiles, setNewFiles] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;

    if (initialData) {
      setForm({
        employeeName: initialData.employeeName || "",
        cpf: initialData.cpf || "",
        startDate: toInputDate(initialData.startDate),
        endDate: toInputDate(initialData.endDate),
        cid: initialData.cid || "",
      });
      setExistingAttachments((initialData.attachments || []).map((name) => ({ name, keep: true })));
    } else {
      setForm(INITIAL_STATE);
      setExistingAttachments([]);
    }

    setNewFiles([]);
    setError("");
  }, [open, initialData]);

  const afastamentoInfo = useMemo(
    () => calculateAfastamentoInfo(form.startDate, form.endDate),
    [form.startDate, form.endDate]
  );

  if (!open) return null;

  const totalAttachments = existingAttachments.filter((item) => item.keep).length + newFiles.length;

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!form.employeeName.trim() || !form.cpf.trim() || !form.startDate) {
      setError("Nome, CPF e data inicial são obrigatórios.");
      return;
    }

    if (totalAttachments > 3) {
      setError("Máximo de 3 anexos por atestado.");
      return;
    }

    const formData = new FormData();
    formData.append("employeeName", form.employeeName.trim());
    formData.append("cpf", form.cpf.trim());
    formData.append("startDate", form.startDate);
    formData.append("endDate", form.endDate || "");
    formData.append("cid", form.cid.trim());

    if (isEditing) {
      const keep = existingAttachments.filter((item) => item.keep).map((item) => item.name);
      formData.append("keepAttachmentNames", JSON.stringify(keep));
    }

    newFiles.forEach((file) => {
      formData.append("attachments", file);
    });

    try {
      setSaving(true);
      const path = isEditing ? `/certificates/${initialData.id}` : "/certificates";
      const method = isEditing ? "PUT" : "POST";
      const payload = await apiForm(path, { token, method, formData });
      onSaved(payload.item);
      onClose();
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSaving(false);
    }
  }

  function toggleKeep(name) {
    setExistingAttachments((old) => old.map((item) => (item.name === name ? { ...item, keep: !item.keep } : item)));
  }

  function handleFileSelection(event) {
    const files = Array.from(event.target.files || []);
    const currentKeep = existingAttachments.filter((item) => item.keep).length;

    if (currentKeep + files.length > 3) {
      setError("Você pode manter/enviar até 3 anexos no total.");
      return;
    }

    setError("");
    setNewFiles(files);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{isEditing ? "Editar atestado" : "Novo atestado"}</h3>
          <button className="icon-btn" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          <label>
            Nome do funcionário *
            <input
              type="text"
              value={form.employeeName}
              onChange={(e) => setForm((old) => ({ ...old, employeeName: e.target.value }))}
            />
          </label>

          <label>
            CPF *
            <input type="text" value={form.cpf} onChange={(e) => setForm((old) => ({ ...old, cpf: e.target.value }))} />
          </label>

          <label>
            Data inicial *
            <input
              type="date"
              value={form.startDate}
              onChange={(e) => setForm((old) => ({ ...old, startDate: e.target.value }))}
            />
          </label>

          <label>
            Data final
            <input
              type="date"
              value={form.endDate}
              onChange={(e) => setForm((old) => ({ ...old, endDate: e.target.value }))}
            />
          </label>

          {afastamentoInfo && (
            <p className="warning-text">
              {afastamentoInfo.totalDays} dias de afastamento, com retorno previsto para {afastamentoInfo.retornoPrevisto}
            </p>
          )}

          <label>
            CID
            <input type="text" value={form.cid} onChange={(e) => setForm((old) => ({ ...old, cid: e.target.value }))} />
          </label>

          {isEditing && existingAttachments.length > 0 && (
            <div>
              <p>Anexos atuais</p>
              <div className="file-list">
                {existingAttachments.map((item) => (
                  <label key={item.name} className="file-item">
                    <input type="checkbox" checked={item.keep} onChange={() => toggleKeep(item.name)} />
                    <span>{item.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <label>
            Novos anexos (PDF/imagem, até 3 no total)
            <input
              type="file"
              accept="application/pdf,image/*"
              multiple
              onChange={handleFileSelection}
            />
          </label>

          {newFiles.length > 0 && (
            <div className="file-list">
              {newFiles.map((file) => (
                <span key={file.name} className="file-item">
                  {file.name}
                </span>
              ))}
            </div>
          )}

          {error && <p className="error-text">{error}</p>}

          <div className="modal-actions">
            <button type="button" className="ghost-btn" onClick={onClose} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" className="primary-btn" disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
