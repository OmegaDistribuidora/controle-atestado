const fs = require("fs");
const path = require("path");
const multer = require("multer");
const { attachmentsDir } = require("./config");

function sanitizeFilenamePart(value) {
  return value.replace(/[^a-zA-Z0-9_.-]/g, "_");
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, attachmentsDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1e9);
    const ext = path.extname(file.originalname || "").toLowerCase();
    const base = path.basename(file.originalname || "anexo", ext);
    const safeBase = sanitizeFilenamePart(base).slice(0, 80);
    cb(null, `${timestamp}_${random}_${safeBase}${ext}`);
  },
});

const allowedMimeTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/jpg",
]);

function fileFilter(req, file, cb) {
  if (!allowedMimeTypes.has(file.mimetype)) {
    cb(new Error("Somente PDF ou imagens são permitidos."));
    return;
  }
  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    files: 3,
    fileSize: 8 * 1024 * 1024,
  },
});

function deleteFilesByName(filenames) {
  for (const name of filenames) {
    const fullPath = path.join(attachmentsDir, name);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  }
}

module.exports = {
  upload,
  deleteFilesByName,
};

