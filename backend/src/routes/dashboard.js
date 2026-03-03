const express = require("express");

const prisma = require("../db");
const { authRequired } = require("../middleware");
const { nowInFortaleza } = require("../utils/date");
const { buildCertificatesWhere, buildDeclarationsWhere } = require("../utils/filters");
const { serializeCertificate, serializeDeclaration } = require("../utils/serializers");

const router = express.Router();

router.get("/summary", authRequired, async (req, res) => {
  const todayStart = nowInFortaleza().startOf("day").toDate();
  const todayEnd = nowInFortaleza().endOf("day").toDate();

  const [
    totalCertificates,
    totalDeclarations,
    aggregateDays,
    aggregateDeclarationMinutes,
    activeCpfList,
    declarationsToday,
  ] = await Promise.all([
    prisma.certificate.count(),
    prisma.declaration.count(),
    prisma.certificate.aggregate({ _sum: { totalDays: true } }),
    prisma.declaration.aggregate({ _sum: { totalMinutes: true } }),
    prisma.certificate.findMany({
      where: {
        startDate: { lte: todayEnd },
        endDate: { gte: todayStart },
      },
      distinct: ["cpf"],
      select: { cpf: true },
    }),
    prisma.declaration.count({
      where: {
        declarationDate: { gte: todayStart, lte: todayEnd },
      },
    }),
  ]);

  const totalDeclarationHours = Number(((aggregateDeclarationMinutes._sum.totalMinutes || 0) / 60).toFixed(2));

  return res.json({
    totalCertificates,
    totalDeclarations,
    totalDays: aggregateDays._sum.totalDays || 0,
    totalDeclarationHours,
    activeEmployeesToday: activeCpfList.length,
    declarationsToday,
  });
});

router.get("/recent", authRequired, async (req, res) => {
  const certificateWhere = buildCertificatesWhere(req.query);
  const declarationWhere = buildDeclarationsWhere(req.query);
  const hasTotalDaysFilter = Boolean(req.query.totalDays);

  const [certificates, declarations] = await Promise.all([
    prisma.certificate.findMany({
      where: certificateWhere,
      take: 40,
      orderBy: { registrationDate: "desc" },
      include: {
        attachments: true,
        createdBy: { select: { id: true, username: true } },
      },
    }),
    hasTotalDaysFilter
      ? Promise.resolve([])
      : prisma.declaration.findMany({
          where: declarationWhere,
          take: 40,
          orderBy: { registrationDate: "desc" },
          include: {
            declarationFiles: true,
            createdBy: { select: { id: true, username: true } },
          },
        }),
  ]);

  const merged = [
    ...certificates.map((item) => ({
      ...serializeCertificate(item),
      type: "CERTIFICATE",
    })),
    ...declarations.map((item) => ({
      ...serializeDeclaration(item),
      type: "DECLARATION",
    })),
  ]
    .sort((a, b) => new Date(b.registrationDate).getTime() - new Date(a.registrationDate).getTime())
    .slice(0, 20);

  return res.json({
    items: merged,
  });
});

module.exports = router;

