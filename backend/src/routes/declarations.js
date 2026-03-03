const express = require("express");
const fs = require("fs");
const path = require("path");
const { z } = require("zod");

const prisma = require("../db");
const { authRequired } = require("../middleware");
const { upload, deleteFilesByName } = require("../upload");
const { attachmentsDir } = require("../config");
const { nowInFortaleza, parseDateInFortaleza } = require("../utils/date");
const { buildDeclarationsWhere, buildPagination } = require("../utils/filters");
const { serializeDeclaration } = require("../utils/serializers");
const { buildDeclarationSnapshot, recordAuditLog } = require("../services/audit");

const router = express.Router();

const declarationSchema = z.object({
  employeeName: z.string().min(1),
  cpf: z.string().min(1),
  declarationDate: z.string().min(1),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
});

function runUpload(req, res, next) {
  upload.array("attachments", 3)(req, res, (err) => {
    if (!err) return next();
    return res.status(400).json({ message: err.message || "Erro no upload." });
  });
}

function normalizeBody(rawBody) {
  return {
    employeeName: (rawBody.employeeName || "").trim(),
    cpf: String(rawBody.cpf || "")
      .replace(/\D/g, "")
      .slice(0, 11),
    declarationDate: (rawBody.declarationDate || "").trim(),
    startTime: (rawBody.startTime || "").trim(),
    endTime: (rawBody.endTime || "").trim(),
  };
}

function parseHourMinutes(timeInput) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(timeInput);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return hours * 60 + minutes;
}

function normalizeDeclarationValues(values) {
  const declarationDate = parseDateInFortaleza(values.declarationDate);
  if (!declarationDate.isValid()) {
    return { error: "Data da declaração inválida." };
  }

  const startMinutes = parseHourMinutes(values.startTime);
  const endMinutes = parseHourMinutes(values.endTime);
  if (startMinutes === null || endMinutes === null) {
    return { error: "Horários devem estar no formato HH:MM." };
  }

  if (endMinutes <= startMinutes) {
    return { error: "Horário final deve ser maior que o horário inicial." };
  }

  return {
    declarationDate: declarationDate.toDate(),
    startTime: values.startTime,
    endTime: values.endTime,
    totalMinutes: endMinutes - startMinutes,
  };
}

router.get("/", authRequired, async (req, res) => {
  const where = buildDeclarationsWhere(req.query);
  const { page, limit, skip } = buildPagination(req.query, 20);

  const [total, items] = await Promise.all([
    prisma.declaration.count({ where }),
    prisma.declaration.findMany({
      where,
      skip,
      take: limit,
      orderBy: { registrationDate: "desc" },
      include: {
        declarationFiles: true,
        createdBy: { select: { id: true, username: true } },
      },
    }),
  ]);

  return res.json({
    page,
    limit,
    total,
    items: items.map(serializeDeclaration),
  });
});

router.get("/:id", authRequired, async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ message: "ID inválido." });
  }

  const declaration = await prisma.declaration.findUnique({
    where: { id },
    include: {
      declarationFiles: true,
      createdBy: { select: { id: true, username: true } },
    },
  });

  if (!declaration) {
    return res.status(404).json({ message: "Declaração não encontrada." });
  }

  return res.json({ item: serializeDeclaration(declaration) });
});

router.get("/:id/attachments/:filename", authRequired, async (req, res) => {
  const id = Number(req.params.id);
  const filename = decodeURIComponent(req.params.filename || "");

  if (Number.isNaN(id)) {
    return res.status(400).json({ message: "ID inválido." });
  }

  if (!filename || filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
    return res.status(400).json({ message: "Nome de anexo inválido." });
  }

  const attachment = await prisma.declarationAttachment.findFirst({
    where: {
      declarationId: id,
      filename,
    },
  });

  if (!attachment) {
    return res.status(404).json({ message: "Anexo não encontrado para esta declaração." });
  }

  const fullPath = path.join(attachmentsDir, filename);
  if (!fs.existsSync(fullPath)) {
    return res.status(404).json({ message: "Arquivo de anexo não encontrado no servidor." });
  }

  res.setHeader("Content-Disposition", `inline; filename="${path.basename(filename)}"`);
  return res.sendFile(fullPath);
});

router.post("/", authRequired, runUpload, async (req, res) => {
  const uploadedFilenames = (req.files || []).map((file) => file.filename);

  try {
    const normalized = normalizeBody(req.body);
    const parsed = declarationSchema.safeParse(normalized);
    if (!parsed.success) {
      deleteFilesByName(uploadedFilenames);
      return res.status(400).json({ message: "Dados inválidos para lançamento de declaração." });
    }

    if (uploadedFilenames.length > 3) {
      deleteFilesByName(uploadedFilenames);
      return res.status(400).json({ message: "É permitido anexar no máximo 3 arquivos." });
    }

    const declarationValues = normalizeDeclarationValues(parsed.data);
    if (declarationValues.error) {
      deleteFilesByName(uploadedFilenames);
      return res.status(400).json({ message: declarationValues.error });
    }

    const created = await prisma.$transaction(async (tx) => {
      const createdItem = await tx.declaration.create({
        data: {
          employeeName: parsed.data.employeeName,
          cpf: parsed.data.cpf,
          declarationDate: declarationValues.declarationDate,
          registrationDate: nowInFortaleza().second(0).millisecond(0).toDate(),
          startTime: declarationValues.startTime,
          endTime: declarationValues.endTime,
          totalMinutes: declarationValues.totalMinutes,
          createdById: req.user.userId,
          declarationFiles: {
            create: uploadedFilenames.map((filename) => ({ filename })),
          },
        },
        include: {
          declarationFiles: true,
          createdBy: { select: { id: true, username: true } },
        },
      });

      await recordAuditLog(tx, {
        action: "CREATE",
        entityType: "DECLARATION",
        entityId: createdItem.id,
        performedById: req.user.userId,
        afterData: buildDeclarationSnapshot(createdItem),
      });

      return createdItem;
    });

    return res.status(201).json({ item: serializeDeclaration(created) });
  } catch (error) {
    deleteFilesByName(uploadedFilenames);
    return res.status(500).json({ message: "Erro ao salvar declaração." });
  }
});

router.put("/:id", authRequired, runUpload, async (req, res) => {
  const id = Number(req.params.id);
  const uploadedFilenames = (req.files || []).map((file) => file.filename);

  if (Number.isNaN(id)) {
    deleteFilesByName(uploadedFilenames);
    return res.status(400).json({ message: "ID inválido." });
  }

  try {
    const existing = await prisma.declaration.findUnique({
      where: { id },
      include: { declarationFiles: true },
    });

    if (!existing) {
      deleteFilesByName(uploadedFilenames);
      return res.status(404).json({ message: "Declaração não encontrada." });
    }

    const normalized = normalizeBody(req.body);
    const parsed = declarationSchema.safeParse(normalized);
    if (!parsed.success) {
      deleteFilesByName(uploadedFilenames);
      return res.status(400).json({ message: "Dados inválidos para edição de declaração." });
    }

    let keepAttachmentNames = existing.declarationFiles.map((a) => a.filename);

    if (typeof req.body.keepAttachmentNames === "string") {
      let parsedList;
      try {
        parsedList = JSON.parse(req.body.keepAttachmentNames);
      } catch (error) {
        deleteFilesByName(uploadedFilenames);
        return res.status(400).json({ message: "Lista de anexos inválida." });
      }

      if (!Array.isArray(parsedList)) {
        deleteFilesByName(uploadedFilenames);
        return res.status(400).json({ message: "Lista de anexos inválida." });
      }

      keepAttachmentNames = parsedList
        .map((item) => String(item))
        .filter((item) => existing.declarationFiles.some((a) => a.filename === item));
    }

    if (keepAttachmentNames.length + uploadedFilenames.length > 3) {
      deleteFilesByName(uploadedFilenames);
      return res.status(400).json({ message: "Máximo de 3 anexos por declaração." });
    }

    const declarationValues = normalizeDeclarationValues(parsed.data);
    if (declarationValues.error) {
      deleteFilesByName(uploadedFilenames);
      return res.status(400).json({ message: declarationValues.error });
    }

    const toDelete = existing.declarationFiles
      .map((a) => a.filename)
      .filter((name) => !keepAttachmentNames.includes(name));
    const attachmentNames = [...keepAttachmentNames, ...uploadedFilenames];

    const beforeData = buildDeclarationSnapshot(existing);

    const updated = await prisma.$transaction(async (tx) => {
      const updatedItem = await tx.declaration.update({
        where: { id },
        data: {
          employeeName: parsed.data.employeeName,
          cpf: parsed.data.cpf,
          declarationDate: declarationValues.declarationDate,
          startTime: declarationValues.startTime,
          endTime: declarationValues.endTime,
          totalMinutes: declarationValues.totalMinutes,
          declarationFiles: {
            deleteMany: {},
            create: attachmentNames.map((filename) => ({ filename })),
          },
        },
        include: {
          declarationFiles: true,
          createdBy: { select: { id: true, username: true } },
        },
      });

      await recordAuditLog(tx, {
        action: "UPDATE",
        entityType: "DECLARATION",
        entityId: updatedItem.id,
        performedById: req.user.userId,
        beforeData,
        afterData: buildDeclarationSnapshot(updatedItem),
      });

      return updatedItem;
    });

    deleteFilesByName(toDelete);
    return res.json({ item: serializeDeclaration(updated) });
  } catch (error) {
    deleteFilesByName(uploadedFilenames);
    return res.status(500).json({ message: "Erro ao editar declaração." });
  }
});

router.delete("/:id", authRequired, async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ message: "ID inválido." });
  }

  const existing = await prisma.declaration.findUnique({
    where: { id },
    include: { declarationFiles: true },
  });

  if (!existing) {
    return res.status(404).json({ message: "Declaração não encontrada." });
  }

  await prisma.$transaction(async (tx) => {
    await tx.declaration.delete({ where: { id } });
    await recordAuditLog(tx, {
      action: "DELETE",
      entityType: "DECLARATION",
      entityId: existing.id,
      performedById: req.user.userId,
      beforeData: buildDeclarationSnapshot(existing),
    });
  });
  deleteFilesByName(existing.declarationFiles.map((item) => item.filename));

  return res.json({ message: "Declaração excluída com sucesso." });
});

module.exports = router;
