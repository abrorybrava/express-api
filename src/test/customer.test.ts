import request from "supertest";
import app from "../server"; // Aplikasi Express.js Anda
import { PrismaClient } from "../../generated/db2";
import jwt from "jsonwebtoken"; // Gunakan jwt untuk membuat token jika diperlukan
import { error } from "console";
import { header } from "express-validator";

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL_DB2 } },
});

let token: string;
const newCustomer = {
  customer_id: 999,
  customer_name: "John Doe",
  customer_email: "john.doe@example.com",
  customer_phone: "123456789",
  customer_status: 1,
};

beforeAll(async () => {
  const loginResponse = await request(app)
    .post("/login")
    .send({ email: "brava@gmail.com", password: "brava" });

  expect(loginResponse.status).toBe(200);
  token = loginResponse.body.data.token;
  console.log('cek token ', token)
});

afterAll(async () => {
  await prisma.customer.delete({ where: { customer_id: newCustomer.customer_id } }); 
  await prisma.$disconnect();
});



describe("Customer Controller API Tests", () => {
  let customerId: number;
    it("GET /customers - Harus mengembalikan semua pelanggan (dengan otorisasi)", async () => {
      const response = await request(app)
        .get("/customers")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      console.log(response.body)
      error('error: ', response.error)
    });

 it("POST /customers - Harus membuat pelanggan baru (dengan otorisasi)", async () => {
    const response = await request(app)
      .post("/customers")
      .set("Authorization", `Bearer ${token}`)
      .send(newCustomer);

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty("message", "Customer created successfully");
    customerId = response.body.data.customer.customer_id; 
  });

  it("GET /customers/:id - Harus mengembalikan pelanggan berdasarkan ID (dengan otorisasi)", async () => {
    const response = await request(app)
      .get(`/customers/${customerId}`)
      .set("Authorization", `Bearer ${token}`); 

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("customer_id", customerId);
  });

  it("PUT /customers/:id - Harus mengupdate pelanggan berdasarkan ID (dengan otorisasi)", async () => {
    const updatedCustomer = {
      customer_name: "John Updated",
      customer_email: "john.updated@example.com",
      customer_phone: "987654321",
      customer_status: 1,
    };

    const response = await request(app)
      .put(`/customers/${customerId}`)
      .set("Authorization", `Bearer ${token}`)
      .send(updatedCustomer);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("message", "Customer updated successfully");
    expect(response.body.data).toHaveProperty("customer_name", "John Updated");
  });

  it("DELETE /customers/:id - Harus menonaktifkan pelanggan berdasarkan ID (dengan otorisasi)", async () => {
    const response = await request(app)
      .delete(`/customers/${customerId}`)
      .set("Authorization", `Bearer ${token}`); // Menambahkan token ke header Authorization

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("message", "Customer deleted successfully");
  }); 
});
