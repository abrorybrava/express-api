import express, { Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { PrismaClient } from "../../generated/db1";
import { body, validationResult } from "express-validator";
import dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL_DB1 } },
});
const router = express.Router();

// Get All Users Route
router.get("/", async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });
    res.status(200).send(users);
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: "Failed to fetch users" });
  }
});

export default router;
