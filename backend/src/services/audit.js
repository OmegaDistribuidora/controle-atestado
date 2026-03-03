const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const timezone = require("dayjs/plugin/timezone");

const { fortalezaTz } = require("../config");

dayjs.extend(utc);
dayjs.extend(timezone);

const FIELD_CONFIG = {
  CERTIFICATE: [
    ["employeeName", "Funcionario"],
    ["cpf", "CPF"],
    ["startDate", "Data inicial"],
    ["endDate", "Data final"],
    ["cid", "CID"],
    ["totalDays", "Dias totais"],
    ["attachments", "Anexos"],
  ],
  DECLARATION: [
    ["employeeName", "Funcionario"],
    ["cpf", "CPF"],
    ["declarationDate", "Data"],
    ["startTime", "Horario inicial"],
    ["endTime", "Horario final"],
    ["totalHours", "Total de horas"],
    ["attachments", "Anexos"],
  ],
};

function normalizeCpf(value) {
  return String(value || "")
    .replace(/\D/g, "")
    .slice(0, 11);
}

function formatDateOnly(value) {
  if (!value) return null;
  return dayjs(value).tz(fortalezaTz).format("YYYY-MM-DD");
}

function extractFilenames(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item) return null;
      if (typeof item === "string") return item;
      if (typeof item.filename === "string") return item.filename;
      return null;
    })
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "pt-BR", { sensitivity: "base" }));
}

function normalizeForCompare(value) {
  if (Array.isArray(value)) return JSON.stringify(value);
  if (value === undefined || value === "") return null;
  return value;
}

function formatSnapshotValue(field, value) {
  if (value === undefined || value === null || value === "") return "-";
  if (Array.isArray(value)) return value.length ? value.join(", ") : "-";
  if (field === "cid") return String(value).trim() || "-";
  return String(value);
}

function buildChanges(entityType, beforeData, afterData) {
  const config = FIELD_CONFIG[entityType] || [];
  const changes = [];

  for (const [field, label] of config) {
    const beforeRaw = beforeData?.[field] ?? null;
    const afterRaw = afterData?.[field] ?? null;

    if (normalizeForCompare(beforeRaw) === normalizeForCompare(afterRaw)) continue;

    changes.push({
      field,
      label,
      before: formatSnapshotValue(field, beforeRaw),
      after: formatSnapshotValue(field, afterRaw),
    });
  }

  return changes;
}

function buildCertificateSnapshot(record) {
  return {
    employeeName: String(record.employeeName || "").trim(),
    cpf: normalizeCpf(record.cpf),
    startDate: formatDateOnly(record.startDate),
    endDate: formatDateOnly(record.endDate),
    cid: record.cid ? String(record.cid).trim() : null,
    totalDays: Number(record.totalDays || 0),
    attachments: extractFilenames(record.attachments),
  };
}

function buildDeclarationSnapshot(record) {
  const totalMinutes = Number(record.totalMinutes || 0);
  return {
    employeeName: String(record.employeeName || "").trim(),
    cpf: normalizeCpf(record.cpf),
    declarationDate: formatDateOnly(record.declarationDate),
    startTime: record.startTime || null,
    endTime: record.endTime || null,
    totalHours: Number((totalMinutes / 60).toFixed(2)),
    attachments: extractFilenames(record.declarationFiles),
  };
}

async function recordAuditLog(prismaClient, payload) {
  const {
    action,
    entityType,
    entityId,
    performedById,
    beforeData = null,
    afterData = null,
  } = payload;

  const reference = afterData || beforeData || {};
  const employeeName = String(reference.employeeName || "").trim();
  const cpf = normalizeCpf(reference.cpf);
  const changes = action === "UPDATE" ? buildChanges(entityType, beforeData, afterData) : null;

  await prismaClient.auditLog.create({
    data: {
      action,
      entityType,
      entityId,
      performedById,
      employeeName,
      cpf,
      beforeData,
      afterData,
      changes,
    },
  });
}

module.exports = {
  buildCertificateSnapshot,
  buildDeclarationSnapshot,
  recordAuditLog,
};
