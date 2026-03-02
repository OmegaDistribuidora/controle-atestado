const express = require("express");
const fs = require("fs");
const path = require("path");
const { z } = require("zod");

const prisma = require("../db");
const { authRequired } = require("../middleware");
const { upload, deleteFilesByName } = require("../upload");
const { attachmentsDir } = require("../config");
const { normalizeAfastamentoDates, nowInFortaleza } = require("../utils/date");
const { buildCertificatesWhere, buildPagination } = require("../utils/filters");
const { serializeCertificate } = require("../utils/serializers");

const router = express.Router();

const certificateSchema = z.object({
  employeeName: z.string().min(1),
  cpf: z.string().min(1),
  startDate: z.string().min(1),
  endDate: z.string().optional().nullable(),
  cid: z.string().optional().nullable(),
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
    cpf: (rawBody.cpf || "").trim(),
    startDate: (rawBody.startDate || "").trim(),
    endDate: rawBody.endDate ? String(rawBody.endDate).trim() : null,
    cid: rawBody.cid ? String(rawBody.cid).trim() : null,
  };
}

router.get("/", authRequired, async (req, res) => {
  const where = buildCertificatesWhere(req.query);
  const { page, limit, skip } = buildPagination(req.query, 20);

  const [total, items] = await Promise.all([
    prisma.certificate.count({ where }),
    prisma.certificate.findMany({
      where,
      skip,
      take: limit,
      orderBy: { registrationDate: "desc" },
      include: {
        attachments: true,
        createdBy: { select: { id: true, username: true } },
      },
    }),
  ]);

  return res.json({
    page,
    limit,
    total,
    items: items.map(serializeCertificate),
  });
});

router.get("/:id", authRequired, async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ message: "ID inválido." });
  }

  const certificate = await prisma.certificate.findUnique({
    where: { id },
    include: {
      attachments: true,
      createdBy: { select: { id: true, username: true } },
    },
  });

  if (!certificate) {
    return res.status(404).json({ message: "Atestado não encontrado." });
  }

  return res.json({ item: serializeCertificate(certificate) });
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

  const attachment = await prisma.attachment.findFirst({
    where: {
      certificateId: id,
      filename,
    },
  });

  if (!attachment) {
    return res.status(404).json({ message: "Anexo não encontrado para este atestado." });
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
    const parsed = certificateSchema.safeParse(normalized);
    if (!parsed.success) {
      deleteFilesByName(uploadedFilenames);
      return res.status(400).json({ message: "Dados inválidos para lançamento de atestado." });
    }

    if (uploadedFilenames.length > 3) {
      deleteFilesByName(uploadedFilenames);
      return res.status(400).json({ message: "É permitido anexar no máximo 3 arquivos." });
    }

    const dateResult = normalizeAfastamentoDates(parsed.data.startDate, parsed.data.endDate);
    if (dateResult.error) {
      deleteFilesByName(uploadedFilenames);
      return res.status(400).json({ message: dateResult.error });
    }

    const created = await prisma.certificate.create({
      data: {
        employeeName: parsed.data.employeeName,
        cpf: parsed.data.cpf,
        cid: parsed.data.cid || null,
        startDate: dateResult.startDate,
        endDate: dateResult.endDate,
        registrationDate: nowInFortaleza().second(0).millisecond(0).toDate(),
        totalDays: dateResult.totalDays,
        createdById: req.user.userId,
        attachments: {
          create: uploadedFilenames.map((filename) => ({ filename })),
        },
      },
      include: {
        attachments: true,
        createdBy: { select: { id: true, username: true } },
      },
    });

    return res.status(201).json({ item: serializeCertificate(created) });
  } catch (error) {
    deleteFilesByName(uploadedFilenames);
    return res.status(500).json({ message: "Erro ao salvar atestado." });
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
    const existing = await prisma.certificate.findUnique({
      where: { id },
      include: {
        attachments: true,
      },
    });

    if (!existing) {
      deleteFilesByName(uploadedFilenames);
      return res.status(404).json({ message: "Atestado não encontrado." });
    }

    const normalized = normalizeBody(req.body);
    const parsed = certificateSchema.safeParse(normalized);
    if (!parsed.success) {
      deleteFilesByName(uploadedFilenames);
      return res.status(400).json({ message: "Dados inválidos para edição de atestado." });
    }

    let keepAttachmentNames = existing.attachments.map((a) => a.filename);

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
        .filter((item) => existing.attachments.some((a) => a.filename === item));
    }

    if (keepAttachmentNames.length + uploadedFilenames.length > 3) {
      deleteFilesByName(uploadedFilenames);
      return res.status(400).json({ message: "Máximo de 3 anexos por atestado." });
    }

    const dateResult = normalizeAfastamentoDates(parsed.data.startDate, parsed.data.endDate);
    if (dateResult.error) {
      deleteFilesByName(uploadedFilenames);
      return res.status(400).json({ message: dateResult.error });
    }

    const toDelete = existing.attachments
      .map((a) => a.filename)
      .filter((name) => !keepAttachmentNames.includes(name));

    const attachmentNames = [...keepAttachmentNames, ...uploadedFilenames];

    const updated = await prisma.certificate.update({
      where: { id },
      data: {
        employeeName: parsed.data.employeeName,
        cpf: parsed.data.cpf,
        cid: parsed.data.cid || null,
        startDate: dateResult.startDate,
        endDate: dateResult.endDate,
        totalDays: dateResult.totalDays,
        attachments: {
          deleteMany: {},
          create: attachmentNames.map((filename) => ({ filename })),
        },
      },
      include: {
        attachments: true,
        createdBy: { select: { id: true, username: true } },
      },
    });

    deleteFilesByName(toDelete);

    return res.json({ item: serializeCertificate(updated) });
  } catch (error) {
    deleteFilesByName(uploadedFilenames);
    return res.status(500).json({ message: "Erro ao editar atestado." });
  }
});

router.delete("/:id", authRequired, async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ message: "ID inválido." });
  }

  const existing = await prisma.certificate.findUnique({
    where: { id },
    include: { attachments: true },
  });

  if (!existing) {
    return res.status(404).json({ message: "Atestado não encontrado." });
  }

  await prisma.certificate.delete({ where: { id } });
  deleteFilesByName(existing.attachments.map((item) => item.filename));

  return res.json({ message: "Atestado excluído com sucesso." });
});

module.exports = router;

