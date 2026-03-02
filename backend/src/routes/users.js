const express = require("express");
const bcrypt = require("bcryptjs");
const { Role } = require("@prisma/client");
const { z } = require("zod");

const prisma = require("../db");
const { authRequired, requireRole } = require("../middleware");

const router = express.Router();

const createUserSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
  role: z.enum(["ADMIN", "RH"]),
});

router.get("/", authRequired, requireRole(Role.ADMIN), async (req, res) => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      role: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return res.json({ users });
});

router.post("/", authRequired, requireRole(Role.ADMIN), async (req, res) => {
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Dados inválidos para criar usuário." });
  }

  const username = parsed.data.username.trim().toLowerCase();
  const existingUser = await prisma.user.findUnique({ where: { username } });
  if (existingUser) {
    return res.status(409).json({ message: "Já existe um usuário com esse nome." });
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);

  const user = await prisma.user.create({
    data: {
      username,
      passwordHash,
      role: parsed.data.role,
    },
    select: {
      id: true,
      username: true,
      role: true,
      createdAt: true,
    },
  });

  return res.status(201).json({ user });
});

module.exports = router;

