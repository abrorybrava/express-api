import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { PrismaClient } from "../../generated/db1";
import dotenv from "dotenv";
import { loginSchema, registerSchema } from "../utils/validationSchema";

dotenv.config();

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL_DB1 } },
});

const SECRET_KEY = process.env.SECRET_KEY || "default_secret_key";

const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Validasi email dan password
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const { password: _, email: userEmail, ...userWithoutSensitiveData } = user;

    const token = jwt.sign(
      { userId: user.id, role: user.role, name: user.name },
      SECRET_KEY,
      { expiresIn: "10m" } // Expired dalam 1 jam
    );

    res.cookie("token", token, {
      httpOnly: false, 
      secure: process.env.NODE_ENV === "production", 
      sameSite: "strict", 
      maxAge: 600000,
    });

    const data = userWithoutSensitiveData;

    res.status(200).json({ message: "Login successful", data: {token, data} });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Internal server error", error});
  }
};


const register = async (req: Request, res: Response) => {
  try {
    await registerSchema.validate(req.body);
    const { email, password, name, role } = req.body;
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      res.status(400).send({ error: "Email already used" });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role,
      },
    });

    res.status(201).send({ success: true, message: "Registration successful" });
  } catch (error) {
    console.error(error);
    res.status(500).send({ success: false, error: "Registration failed" });
  }
};

export default { login, register };
