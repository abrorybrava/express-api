import request from "supertest";
import app from "../server"; // Ganti dengan file utama aplikasi Express Anda
import { PrismaClient } from "../../generated/db1";

const prisma = new PrismaClient();

describe("AuthController Tests", () => {
  beforeAll(async () => {
    // Bersihkan database sebelum pengujian
    await prisma.user.deleteMany({});
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("POST /register", () => {
    it("should register a new user successfully", async () => {
      const response = await request(app)
        .post("/auth/register")
        .send({
          email: "testuser@example.com",
          password: "password123",
          name: "Test User",
          role: "user",
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("success", true);
      expect(response.body).toHaveProperty("message", "Registration successful");

      const user = await prisma.user.findUnique({
        where: { email: "testuser@example.com" },
      });
      expect(user).not.toBeNull();
      expect(user?.name).toBe("Test User");
    });

    it("should fail if email is already used", async () => {
      const response = await request(app)
        .post("/auth/register")
        .send({
          email: "testuser@example.com",
          password: "password123",
          name: "Duplicate User",
          role: "user",
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error", "Email already used");
    });
  });

  describe("POST /login", () => {
    it("should login successfully with valid credentials", async () => {
      const response = await request(app)
        .post("/auth/login")
        .send({
          email: "testuser@example.com",
          password: "password123",
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("success", true);
      expect(response.body).toHaveProperty("message", "Login successful");
      expect(response.body.data).toHaveProperty("token");
    });

    it("should fail with invalid password", async () => {
      const response = await request(app)
        .post("/auth/login")
        .send({
          email: "testuser@example.com",
          password: "wrongpassword",
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty("message", "Invalid credentials");
    });

    it("should fail if user is not found", async () => {
      const response = await request(app)
        .post("/auth/login")
        .send({
          email: "brava@gmail.com",
          password: "brava",
        });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("message", "User not found");
    });
  });
});
