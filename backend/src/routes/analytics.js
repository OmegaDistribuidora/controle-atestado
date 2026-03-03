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

module.exports = router;

