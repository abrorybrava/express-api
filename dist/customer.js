"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const client_1 = require("@prisma/client");
const router = express_1.default.Router();
const prisma = new client_1.PrismaClient(); // Inisialisasi Prisma Client
// CREATE Customer
router.post('/', async (req, res) => {
    try {
        const { customer_name, customer_email, customer_phone, customer_status } = req.body;
        // Validasi Input
        if (!customer_name || !customer_email) {
            res.status(400).send({ error: 'Name and Email are required.' });
            return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer_email)) {
            res.status(400).send({ error: 'Invalid email format.' });
            return;
        }
        const customer = await prisma.customer.create({
            data: {
                customer_name,
                customer_email,
                customer_phone: customer_phone || null,
                customer_status: customer_status || 1,
            },
        });
        res.status(201).send({ message: 'Customer created successfully', data: customer });
    }
    catch (err) {
        console.error('Error inserting customer:', err);
        res.status(500).send({ error: 'An error occurred while creating the customer.' });
    }
});
// READ all Customers
router.get('/', async (_req, res) => {
    try {
        const customers = await prisma.customer.findMany({
            where: { customer_status: 1 }, // Hanya ambil customer dengan status aktif
        });
        res.send(customers);
    }
    catch (err) {
        console.error('Error fetching customers:', err);
        res.status(500).send({ error: 'An error occurred while fetching customers. Please try again later.' });
    }
});
// GET Customer by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const customer = await prisma.customer.findUnique({
            where: { customer_id: Number(id) },
        });
        if (!customer) {
            res.status(404).send({ error: 'Customer not found.' });
            return;
        }
        res.send(customer);
    }
    catch (err) {
        console.error('Error fetching customer by ID:', err);
        res.status(500).send({ error: 'An error occurred while fetching the customer.' });
    }
});
// UPDATE Customer
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { customer_name, customer_email, customer_phone, customer_status } = req.body;
        // Validasi Input
        if (!customer_name || !customer_email) {
            res.status(400).send({ error: 'Name and Email are required.' });
            return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer_email)) {
            res.status(400).send({ error: 'Invalid email format.' });
            return;
        }
        const customer = await prisma.customer.update({
            where: { customer_id: Number(id) },
            data: {
                customer_name,
                customer_email,
                customer_phone: customer_phone || null,
                customer_status: customer_status || 1,
            },
        });
        res.send({ message: 'Customer updated successfully', data: customer });
    }
    catch (err) {
        console.error('Error updating customer:', err);
        res.status(500).send({ error: 'An error occurred while updating the customer.' });
    }
});
// DELETE Customer
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const customer = await prisma.customer.update({
            where: { customer_id: Number(id) },
            data: { customer_status: 0 }, // Menandai status customer sebagai tidak aktif (deleted)
        });
        if (!customer) {
            res.status(404).send({ error: 'Customer not found.' });
            return;
        }
        res.send({ message: 'Customer deleted successfully' });
    }
    catch (err) {
        console.error('Error deleting customer:', err);
        res.status(500).send({ error: 'An error occurred while deleting the customer.' });
    }
});
exports.default = router;
