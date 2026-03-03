import { useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { apiForm, apiJson } from "../services/api";
import { formatCpf, normalizeCpf } from "../services/cpf";

const INITIAL_STATE = {
  employeeName: "",
  cpf: "",
  declarationDate: "",
  startTime: "",
  endTime: "",
};

function toInputDate(dateValue) {
  if (!dateValue) return "";
  return new Date(dateValue).toISOString().slice(0, 10);
}

function calculateHours(startTime, endTime) {
  const toMinutes = (time) => {
    const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time || "");
    if (!match) return null;
    return Number(match[1]) * 60 + Number(match[2]);
  };

  const startMinutes = toMinutes(startTime);
  const endMinutes = toMinutes(endTime);
  if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) return null;

  const hours = (endMinutes - startMinutes) / 60;
  return Number(hours.toFixed(2));
}

export default function DeclarationFormModal({ open, onClose, token, initialData, onSaved }) {
  const isEditing = Boolean(initialData?.id);
  const [form, setForm] = useState(INITIAL_STATE);
  const [existingAttachments, setExistingAttachments] = useState([]);
  const [newFiles, setNewFiles] = useState([]);
  const [nameSuggestions, setNameSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const nameFieldRef = useRef(null);
  const fetchSeqRef = useRef(0);

  useEffect(() => {
    if (!open) return;

    if (initialData) {
      setForm({
        employeeName: initialData.employeeName || "",
        cpf: formatCpf(initialData.cpf || ""),
        declarationDate: toInputDate(initialData.declarationDate),
        startTime: initialData.startTime || "",
        endTime: initialData.endTime || "",
      });
      setExistingAttachments((initialData.attachments || []).map((name) => ({ name, keep: true })));
    } else {
      setForm(INITIAL_STATE);
      setExistingAttachments([]);
    }

    setNewFiles([]);
    setNameSuggestions([]);
    setShowSuggestions(false);
    setError("");
  }, [open, initialData]);

  useEffect(() => {
    if (!open) return undefined;

    function handleClickOutside(event) {
      if (!nameFieldRef.current) return;
      if (!nameFieldRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;

    const query = form.employeeName.trim();
    if (query.length < 2) {
      setNameSuggestions([]);
      setLoadingSuggestions(false);
      return undefined;
    }

    const currentSeq = fetchSeqRef.current + 1;
    fetchSeqRef.current = currentSeq;
    setLoadingSuggestions(true);

    const timeout = setTimeout(async () => {
      try {
        const payload = await apiJson(`/certificates/employees/suggestions?q=${encodeURIComponent(query)}`, { token });
        if (fetchSeqRef.current !== currentSeq) return;
        setNameSuggestions(payload.items || []);
      } catch (fetchError) {
        if (fetchSeqRef.current !== currentSeq) return;
        setNameSuggestions([]);
      } finally {
        if (fetchSeqRef.current === currentSeq) setLoadingSuggestions(false);
      }
    }, 220);

    return () => clearTimeout(timeout);
  }, [form.employeeName, open, token]);

  const totalHours = useMemo(() => calculateHours(form.startTime, form.endTime), [form.startTime, form.endTime]);

  if (!open) return null;

  const totalAttachments = existingAttachments.filter((item) => item.keep).length + newFiles.length;

  function applySuggestion(suggestion) {
    setForm((old) => ({
      ...old,
      employeeName: suggestion.employeeName,
      cpf: formatCpf(suggestion.cpf),
    }));
    setShowSuggestions(false);
  }

  function toggleKeep(name) {
    setExistingAttachments((old) => old.map((item) => (item.name === name ? { ...item, keep: !item.keep } : item)));
  }

  function handleFileSelection(event) {
    const files = Array.from(event.target.files || []);
    const currentKeep = existingAttachments.filter((item) => item.keep).length;
    if (currentKeep + files.length > 3) {
      setError("Voce pode manter/enviar ate 3 anexos no total.");
      return;
    }
    setError("");
    setNewFiles(files);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!form.employeeName.trim() || !form.cpf.trim() || !form.declarationDate || !form.startTime || !form.endTime) {
      setError("Nome, CPF, data e horarios sao obrigatorios.");
      return;
    }

    if (!totalHours) {
      setError("Horario final deve ser maior que o horario inicial.");
      return;
    }

    if (totalAttachments > 3) {
      setError("Maximo de 3 anexos por declaracao.");
      return;
    }

    const formData = new FormData();
    formData.append("employeeName", form.employeeName.trim());
    formData.append("cpf", normalizeCpf(form.cpf));
    formData.append("declarationDate", form.declarationDate);
    formData.append("startTime", form.startTime);
    formData.append("endTime", form.endTime);

    if (isEditing) {
      const keep = existingAttachments.filter((item) => item.keep).map((item) => item.name);
      formData.append("keepAttachmentNames", JSON.stringify(keep));
    }

    newFiles.forEach((file) => {
      formData.append("attachments", file);
    });

    try {
      setSaving(true);
      const path = isEditing ? `/declarations/${initialData.id}` : "/declarations";
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

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{isEditing ? "Editar declaracao" : "Nova declaracao"}</h3>
          <button className="icon-btn" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          <div className="suggestion-field" ref={nameFieldRef}>
            <label>
              Nome do funcionario *
              <input
                type="text"
                value={form.employeeName}
                onFocus={() => setShowSuggestions(true)}
                onChange={(e) => {
                  setForm((old) => ({ ...old, employeeName: e.target.value }));
                  setShowSuggestions(true);
                }}
              />
            </label>

            {showSuggestions && (loadingSuggestions || nameSuggestions.length > 0) && (
              <div className="suggestion-dropdown">
                {loadingSuggestions ? (
                  <button type="button" className="suggestion-item" disabled>
                    Buscando sugestoes...
                  </button>
                ) : (
                  nameSuggestions.map((item) => (
                    <button
                      key={`${item.cpf}-${item.employeeName}`}
                      type="button"
                      className="suggestion-item"
                      onClick={() => applySuggestion(item)}
                    >
                      <strong>{item.employeeName}</strong>
                      <span>{formatCpf(item.cpf)}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          <label>
            CPF *
            <input
              type="text"
              value={form.cpf}
              placeholder="000.000.000-00"
              onChange={(e) => setForm((old) => ({ ...old, cpf: formatCpf(e.target.value) }))}
            />
          </label>

          <label>
            Data da declaracao *
            <input
              type="date"
              value={form.declarationDate}
              onChange={(e) => setForm((old) => ({ ...old, declarationDate: e.target.value }))}
            />
          </label>

          <label>
            Horario inicial *
            <input
              type="time"
              value={form.startTime}
              onChange={(e) => setForm((old) => ({ ...old, startTime: e.target.value }))}
            />
          </label>

          <label>
            Horario final *
            <input
              type="time"
              value={form.endTime}
              onChange={(e) => setForm((old) => ({ ...old, endTime: e.target.value }))}
            />
          </label>

          {totalHours ? <p className="warning-text">{totalHours} horas declaradas</p> : null}

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
            Novos anexos (PDF/imagem, ate 3 no total)
            <input type="file" accept="application/pdf,image/*" multiple onChange={handleFileSelection} />
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
