const path = require("path");
const fs = require("fs");

const ATTACHMENTS_DIR = process.env.ATTACHMENTS_DIR || "/anexos";
const RESOLVED_ATTACHMENTS_DIR = path.isAbsolute(ATTACHMENTS_DIR)
  ? ATTACHMENTS_DIR
  : path.resolve(process.cwd(), ATTACHMENTS_DIR);

if (!fs.existsSync(RESOLVED_ATTACHMENTS_DIR)) {
  fs.mkdirSync(RESOLVED_ATTACHMENTS_DIR, { recursive: true });
}

module.exports = {
  port: Number(process.env.PORT || 3000),
  jwtSecret: process.env.JWT_SECRET || "dev-secret",
  nodeEnv: process.env.NODE_ENV || "development",
  attachmentsDir: RESOLVED_ATTACHMENTS_DIR,
  fortalezaTz: "America/Fortaleza",
};

