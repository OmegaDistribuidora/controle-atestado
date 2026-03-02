const express = require("express");

const prisma = require("../db");
const { authRequired } = require("../middleware");
const { nowInFortaleza } = require("../utils/date");
const { buildCertificatesWhere } = require("../utils/filters");
const { serializeCertificate } = require("../utils/serializers");

const router = express.Router();

router.get("/summary", authRequired, async (req, res) => {
  const todayStart = nowInFortaleza().startOf("day").toDate();
  const todayEnd = nowInFortaleza().endOf("day").toDate();

  const [totalCertificates, aggregateDays, activeCpfList] = await Promise.all([
    prisma.certificate.count(),
    prisma.certificate.aggregate({ _sum: { totalDays: true } }),
    prisma.certificate.findMany({
      where: {
        startDate: { lte: todayEnd },
        endDate: { gte: todayStart },
      },
      distinct: ["cpf"],
      select: { cpf: true },
    }),
  ]);

  return res.json({
    totalCertificates,
    totalDays: aggregateDays._sum.totalDays || 0,
    activeEmployeesToday: activeCpfList.length,
  });
});

router.get("/recent", authRequired, async (req, res) => {
  const where = buildCertificatesWhere(req.query);

  const items = await prisma.certificate.findMany({
    where,
    take: 20,
    orderBy: { registrationDate: "desc" },
    include: {
      attachments: true,
      createdBy: { select: { id: true, username: true } },
    },
  });

  return res.json({
    items: items.map(serializeCertificate),
  });
});

module.exports = router;

