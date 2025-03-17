import express, { Request, Response, NextFunction } from "express";
import { PrismaClient } from "../../generated/db2";
import { customerSchema } from "../utils/validationSchema"; // Import schema
import { getWIB } from "../utils/helpers";

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL_DB2 } },
});

const customerController = {
  getAll: async (req: Request, res: Response) => {
    try {
      const customers = await prisma.customer.findMany({
        where: { customer_status: 1 },
        orderBy: {
          created_at: 'desc',
        }
      });
      res.send(customers);
    } catch (err) {
      console.error("Error fetching customers:", err);
      res.status(500).send({
        error:
          "An error occurred while fetching customers. Please try again later.",
      });
    }
  },

  getById: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const customer = await prisma.customer.findUnique({
        where: { customer_id: Number(id) },
      });

      if (!customer) {
        res.status(404).send({ error: "Customer not found." });
        return;
      }

      res.send(customer);
    } catch (err) {
      console.error("Error fetching customer by ID:", err);
      res
        .status(500)
        .send({ error: "An error occurred while fetching the customer." });
    }
  },
  create: [
    async (req: Request, res: Response): Promise<void> => {
      try {
        await customerSchema.validate(req.body);
        const { customer_name, customer_email, customer_phone, customer_status } =
          req.body;
        const user = (req as any).user;
  
        if (!user || !user.userId) {
          res
            .status(401)
            .send({ error: "Unauthorized. User information is missing." });
          return;
        }
        const customer = await prisma.customer.create({
          data: {
            customer_name,
            customer_email,
            customer_phone: customer_phone || null,
            customer_status: customer_status || 1,
            created_at: getWIB(),
            created_by: user.name,
          },
        });

        res.status(201).send({
          message: "Customer created successfully",
          data: { customer, user },
        });
      } catch (err) {
        console.error("Error creating customer:", err);
        res
          .status(500)
          .send({ error: "An error occurred while creating the customer." });
      }
    },
  ],

  update: [
    async (req: Request, res: Response) => {
      try {
        await customerSchema.validate(req.body);
        const { id } = req.params;
        const { customer_name, customer_email, customer_phone, customer_status } =
          req.body;
        const user = (req as any).user;

        const customer = await prisma.customer.update({
          where: { customer_id: Number(id) },
          data: {
            customer_name,
            customer_email,
            customer_phone: customer_phone || null,
            customer_status: customer_status || 1,
            modified_at: getWIB(),
            modified_by: user.name,
          },
        });

        res.send({ message: "Customer updated successfully", data: customer });
      } catch (err) {
        console.error("Error updating customer:", err);
        res
          .status(500)
          .send({ error: "An error occurred while updating the customer." });
      }
    },
  ],

  delete: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const user = (req as any).user;

      const customer = await prisma.customer.update({
        where: { customer_id: Number(id) },
        data: {
          customer_status: 0,
          modified_at: getWIB(),
          modified_by: user.name,
        },
      });

      if (!customer) {
        res.status(404).send({ error: "Customer not found." });
        return;
      }

      res.send({ message: "Customer deleted successfully" });
    } catch (err) {
      console.error("Error deleting customer:", err);
      res
        .status(500)
        .send({ error: "An error occurred while deleting the customer." });
    }
  },
};

export default customerController;
