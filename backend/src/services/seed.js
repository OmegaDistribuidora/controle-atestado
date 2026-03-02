const bcrypt = require("bcryptjs");
const { Role } = require("@prisma/client");
const prisma = require("../db");

async function ensureDefaultUsers() {
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || "Omega@123";
  const rhPassword = process.env.SEED_RH_PASSWORD || "Carlos@123";

  const [admin, rh] = await Promise.all([
    prisma.user.findUnique({ where: { username: "admin" } }),
    prisma.user.findUnique({ where: { username: "rh" } }),
  ]);

  if (!admin) {
    const adminHash = await bcrypt.hash(adminPassword, 10);
    await prisma.user.create({
      data: { username: "admin", passwordHash: adminHash, role: Role.ADMIN },
    });
  }

  if (!rh) {
    const rhHash = await bcrypt.hash(rhPassword, 10);
    await prisma.user.create({
      data: { username: "rh", passwordHash: rhHash, role: Role.RH },
    });
  }
}

module.exports = {
  ensureDefaultUsers,
};

