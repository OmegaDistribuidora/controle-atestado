const express = require("express");
const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const timezone = require("dayjs/plugin/timezone");
const isSameOrBefore = require("dayjs/plugin/isSameOrBefore");

const prisma = require("../db");
const { authRequired } = require("../middleware");
const { fortalezaTz } = require("../config");

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isSameOrBefore);

const router = express.Router();

function normalizeCpf(input) {
  return String(input || "")
    .replace(/\D/g, "")
    .slice(0, 11);
}

function normalizeEmployeeName(input) {
  return String(input || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ");
}

function isPlaceholderCpf(cpf) {
  if (!cpf || cpf.length !== 11) return true;
  return /^(\d)\1{10}$/.test(cpf);
}

function parseSort(query, type) {
  const allowedCertificate = new Set([
    "employeeName",
    "cpf",
    "launchesCount",
    "totalDays",
    "lastRegistrationDate",
    "cidsCount",
  ]);
  const allowedDeclaration = new Set([
    "employeeName",
    "cpf",
    "launchesCount",
    "totalHours",
    "lastRegistrationDate",
  ]);
  const allowed = type === "declaration" ? allowedDeclaration : allowedCertificate;

  const requestedSortBy = String(query.sortBy || "");
  const sortBy = allowed.has(requestedSortBy)
    ? requestedSortBy
    : type === "declaration"
      ? "totalHours"
      : "totalDays";

  const sortDir = String(query.sortDir || "desc").toLowerCase() === "asc" ? "asc" : "desc";
  return { sortBy, sortDir };
}

function sortRows(rows, sortBy, sortDir) {
  const factor = sortDir === "asc" ? 1 : -1;
  const sorted = [...rows];
  sorted.sort((a, b) => {
    const av = a[sortBy];
    const bv = b[sortBy];

    if (av === bv) return 0;
    if (typeof av === "number" && typeof bv === "number") return (av - bv) * factor;
    if (av instanceof Date && bv instanceof Date) return (av.getTime() - bv.getTime()) * factor;

    return String(av).localeCompare(String(bv), "pt-BR", { sensitivity: "base" }) * factor;
  });
  return sorted;
}

router.get("/yearly", authRequired, async (req, res) => {
  const requestedYear = Number(req.query.year) || dayjs().tz(fortalezaTz).year();

  if (requestedYear < 2000 || requestedYear > 2100) {
    return res.status(400).json({ message: "Ano inválido." });
  }

  const yearStart = dayjs.tz(`${requestedYear}-01-01`, "YYYY-MM-DD", fortalezaTz).startOf("day");
  const yearEnd = dayjs.tz(`${requestedYear}-12-31`, "YYYY-MM-DD", fortalezaTz).endOf("day");

  const [certificates, declarations] = await Promise.all([
    prisma.certificate.findMany({
      where: {
        startDate: { lte: yearEnd.toDate() },
        endDate: { gte: yearStart.toDate() },
      },
      select: {
        startDate: true,
        endDate: true,
        cpf: true,
      },
    }),
    prisma.declaration.findMany({
      where: {
        declarationDate: { gte: yearStart.toDate(), lte: yearEnd.toDate() },
      },
      select: {
        declarationDate: true,
        cpf: true,
      },
    }),
  ]);

  const dayToCertificateCpfs = {};
  const dayToDeclarationCpfs = {};

  for (const item of certificates) {
    let current = dayjs(item.startDate).tz(fortalezaTz).startOf("day");
    const end = dayjs(item.endDate).tz(fortalezaTz).startOf("day");

    if (current.isBefore(yearStart)) current = yearStart;
    let boundedEnd = end;
    if (boundedEnd.isAfter(yearEnd)) boundedEnd = yearEnd;

    while (current.isSameOrBefore(boundedEnd, "day")) {
      const key = current.format("YYYY-MM-DD");
      if (!dayToCertificateCpfs[key]) {
        dayToCertificateCpfs[key] = new Set();
      }
      dayToCertificateCpfs[key].add(item.cpf);
      current = current.add(1, "day");
    }
  }

  for (const item of declarations) {
    const key = dayjs(item.declarationDate).tz(fortalezaTz).format("YYYY-MM-DD");
    if (!dayToDeclarationCpfs[key]) {
      dayToDeclarationCpfs[key] = new Set();
    }
    dayToDeclarationCpfs[key].add(item.cpf);
  }

  const certificateCounts = {};
  for (const [day, cpfs] of Object.entries(dayToCertificateCpfs)) {
    certificateCounts[day] = cpfs.size;
  }

  const declarationCounts = {};
  for (const [day, cpfs] of Object.entries(dayToDeclarationCpfs)) {
    declarationCounts[day] = cpfs.size;
  }

  const allDays = new Set([...Object.keys(certificateCounts), ...Object.keys(declarationCounts)]);
  let maxTotalCount = 0;
  for (const day of allDays) {
    const total = (certificateCounts[day] || 0) + (declarationCounts[day] || 0);
    if (total > maxTotalCount) maxTotalCount = total;
  }

  return res.json({
    year: requestedYear,
    certificateCounts,
    declarationCounts,
    maxTotalCount,
  });
});

router.get("/employees", authRequired, async (req, res) => {
  const type = String(req.query.type || "certificate").toLowerCase() === "declaration" ? "declaration" : "certificate";
  const { sortBy, sortDir } = parseSort(req.query, type);

  if (type === "declaration") {
    const rows = await prisma.declaration.findMany({
      select: {
        employeeName: true,
        cpf: true,
        totalMinutes: true,
        registrationDate: true,
      },
      orderBy: { registrationDate: "desc" },
    });

    const map = new Map();
    for (const item of rows) {
      const cpf = normalizeCpf(item.cpf);
      const nameNormalized = normalizeEmployeeName(item.employeeName);
      if (!nameNormalized) continue;

      const groupKey = isPlaceholderCpf(cpf) ? `${cpf}|${nameNormalized}` : cpf;

      if (!map.has(groupKey)) {
        map.set(groupKey, {
          employeeName: item.employeeName,
          cpf,
          launchesCount: 0,
          totalMinutes: 0,
          totalHours: 0,
          lastRegistrationDate: item.registrationDate,
        });
      }

      const row = map.get(groupKey);
      row.launchesCount += 1;
      row.totalMinutes += item.totalMinutes || 0;
      if (new Date(item.registrationDate).getTime() > new Date(row.lastRegistrationDate).getTime()) {
        row.lastRegistrationDate = item.registrationDate;
        row.employeeName = item.employeeName;
      }
    }

    const aggregated = Array.from(map.values()).map((item) => ({
      ...item,
      totalHours: Number((item.totalMinutes / 60).toFixed(2)),
    }));

    const items = sortRows(aggregated, sortBy, sortDir);
    return res.json({ type, sortBy, sortDir, items });
  }

  const rows = await prisma.certificate.findMany({
    select: {
      employeeName: true,
      cpf: true,
      totalDays: true,
      cid: true,
      registrationDate: true,
    },
    orderBy: { registrationDate: "desc" },
  });

  const map = new Map();
  for (const item of rows) {
    const cpf = normalizeCpf(item.cpf);
    const nameNormalized = normalizeEmployeeName(item.employeeName);
    if (!nameNormalized) continue;

    const groupKey = isPlaceholderCpf(cpf) ? `${cpf}|${nameNormalized}` : cpf;

    if (!map.has(groupKey)) {
      map.set(groupKey, {
        employeeName: item.employeeName,
        cpf,
        launchesCount: 0,
        totalDays: 0,
        cids: new Set(),
        cidsCount: 0,
        lastRegistrationDate: item.registrationDate,
      });
    }

    const row = map.get(groupKey);
    row.launchesCount += 1;
    row.totalDays += item.totalDays || 0;
    if (item.cid) row.cids.add(item.cid);
    row.cidsCount = row.cids.size;

    if (new Date(item.registrationDate).getTime() > new Date(row.lastRegistrationDate).getTime()) {
      row.lastRegistrationDate = item.registrationDate;
      row.employeeName = item.employeeName;
    }
  }

  const aggregated = Array.from(map.values()).map((item) => ({
    employeeName: item.employeeName,
    cpf: item.cpf,
    launchesCount: item.launchesCount,
    totalDays: item.totalDays,
    cidsCount: item.cidsCount,
    cids: Array.from(item.cids).sort(),
    lastRegistrationDate: item.lastRegistrationDate,
  }));

  const items = sortRows(aggregated, sortBy, sortDir);
  return res.json({ type, sortBy, sortDir, items });
});

router.get("/employees/:cpf/details", authRequired, async (req, res) => {
  const cpf = normalizeCpf(req.params.cpf);
  const type = String(req.query.type || "certificate").toLowerCase() === "declaration" ? "declaration" : "certificate";
  const employeeNameFilter = normalizeEmployeeName(req.query.employeeName || "");
  const shouldApplyNameFilter = isPlaceholderCpf(cpf) && Boolean(employeeNameFilter);

  if (!cpf) {
    return res.status(400).json({ message: "CPF invalido." });
  }

  if (type === "declaration") {
    let declarations = await prisma.declaration.findMany({
      where: { cpf },
      orderBy: { registrationDate: "desc" },
      select: {
        id: true,
        employeeName: true,
        cpf: true,
        declarationDate: true,
        registrationDate: true,
        startTime: true,
        endTime: true,
        totalMinutes: true,
        createdBy: { select: { username: true } },
      },
    });

    if (shouldApplyNameFilter) {
      declarations = declarations.filter(
        (item) => normalizeEmployeeName(item.employeeName) === employeeNameFilter
      );
    }

    if (!declarations.length) {
      return res.status(404).json({ message: "Nenhum registro encontrado para este colaborador." });
    }

    const totalMinutes = declarations.reduce((acc, item) => acc + (item.totalMinutes || 0), 0);
    return res.json({
      type,
      summary: {
        employeeName: declarations[0].employeeName,
        cpf,
        launchesCount: declarations.length,
        totalHours: Number((totalMinutes / 60).toFixed(2)),
        firstRegistrationDate: declarations[declarations.length - 1].registrationDate,
        lastRegistrationDate: declarations[0].registrationDate,
      },
      items: declarations.map((item) => ({
        id: item.id,
        declarationDate: item.declarationDate,
        registrationDate: item.registrationDate,
        startTime: item.startTime,
        endTime: item.endTime,
        totalHours: Number(((item.totalMinutes || 0) / 60).toFixed(2)),
        launchedBy: item.createdBy?.username || "-",
      })),
    });
  }

  let certificates = await prisma.certificate.findMany({
    where: { cpf },
    orderBy: { registrationDate: "desc" },
    select: {
      id: true,
      employeeName: true,
      cpf: true,
      cid: true,
      startDate: true,
      endDate: true,
      totalDays: true,
      registrationDate: true,
      createdBy: { select: { username: true } },
    },
  });

  if (shouldApplyNameFilter) {
    certificates = certificates.filter(
      (item) => normalizeEmployeeName(item.employeeName) === employeeNameFilter
    );
  }

  if (!certificates.length) {
    return res.status(404).json({ message: "Nenhum registro encontrado para este colaborador." });
  }

  const cidSet = new Set();
  const totalDays = certificates.reduce((acc, item) => acc + (item.totalDays || 0), 0);
  certificates.forEach((item) => {
    if (item.cid) cidSet.add(item.cid);
  });

  return res.json({
    type,
    summary: {
      employeeName: certificates[0].employeeName,
      cpf,
      launchesCount: certificates.length,
      totalDays,
      cids: Array.from(cidSet).sort(),
      firstRegistrationDate: certificates[certificates.length - 1].registrationDate,
      lastRegistrationDate: certificates[0].registrationDate,
    },
    items: certificates.map((item) => ({
      id: item.id,
      registrationDate: item.registrationDate,
      startDate: item.startDate,
      endDate: item.endDate,
      totalDays: item.totalDays,
      cid: item.cid || "-",
      launchedBy: item.createdBy?.username || "-",
    })),
  });
});

module.exports = router;

