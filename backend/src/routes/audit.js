const express = require("express");
const { Role } = require("@prisma/client");

const prisma = require("../db");
const { authRequired, requireRole } = require("../middleware");
const { buildPagination } = require("../utils/filters");

const router = express.Router();

function normalizeAction(value) {
  const action = String(value || "").toUpperCase();
  if (action === "CREATE" || action === "UPDATE" || action === "DELETE") return action;
  return null;
}

function normalizeEntityType(value) {
  const entityType = String(value || "").toUpperCase();
  if (entityType === "CERTIFICATE" || entityType === "DECLARATION") return entityType;
  return null;
}

router.get("/", authRequired, requireRole(Role.ADMIN), async (req, res) => {
  const action = normalizeAction(req.query.action);
  const entityType = normalizeEntityType(req.query.entityType);
  const search = String(req.query.search || "").trim();
  const { page, limit, skip } = buildPagination(req.query, 20);

  const where = {};
  if (action) where.action = action;
  if (entityType) where.entityType = entityType;

  if (search) {
    const digits = search.replace(/\D/g, "");
    where.OR = [
      { employeeName: { contains: search, mode: "insensitive" } },
      { performedBy: { username: { contains: search, mode: "insensitive" } } },
    ];

    if (digits) {
      where.OR.push({ cpf: { contains: digits } });
    }
  }

  const [total, items] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        performedBy: {
          select: {
            id: true,
            username: true,
            role: true,
          },
        },
      },
    }),
  ]);

  return res.json({
    page,
    limit,
    total,
    items: items.map((item) => ({
      id: item.id,
      action: item.action,
      entityType: item.entityType,
      entityId: item.entityId,
      employeeName: item.employeeName,
      cpf: item.cpf,
      createdAt: item.createdAt,
      performedBy: item.performedBy,
    })),
  });
});

router.get("/:id", authRequired, requireRole(Role.ADMIN), async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ message: "ID invalido." });
  }

  const item = await prisma.auditLog.findUnique({
    where: { id },
    include: {
      performedBy: {
        select: {
          id: true,
          username: true,
          role: true,
        },
      },
    },
  });

  if (!item) {
    return res.status(404).json({ message: "Registro de auditoria nao encontrado." });
  }

  return res.json({
    item: {
      id: item.id,
      action: item.action,
      entityType: item.entityType,
      entityId: item.entityId,
      employeeName: item.employeeName,
      cpf: item.cpf,
      createdAt: item.createdAt,
      beforeData: item.beforeData || null,
      afterData: item.afterData || null,
      changes: Array.isArray(item.changes) ? item.changes : [],
      performedBy: item.performedBy,
    },
  });
});

module.exports = router;
