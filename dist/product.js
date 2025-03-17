"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const client_1 = require("@prisma/client");
const router = express_1.default.Router();
const prisma = new client_1.PrismaClient(); // Inisialisasi Prisma Client
// CREATE Product
router.post('/', async (req, res) => {
    try {
        const { product_name, product_price, product_status } = req.body;
        // Validasi Input
        if (!product_name || product_price == null || product_price < 0) {
            res.status(400).send({ error: 'Product name and a valid price are required.' });
            return;
        }
        const product = await prisma.product.create({
            data: {
                product_name,
                product_price,
                product_status: product_status ?? 1, // Default status tersedia
            },
        });
        res.status(201).send({ message: 'Product created successfully', data: product });
    }
    catch (err) {
        console.error('Error inserting product:', err);
        res.status(500).send({ error: 'An error occurred while creating the product.' });
    }
});
// READ all Products
router.get('/', async (req, res) => {
    try {
        const products = await prisma.product.findMany({
            where: { product_status: 1 }, // Hanya ambil produk dengan status tersedia
        });
        res.send(products);
    }
    catch (err) {
        console.error('Error fetching products:', err);
        res.status(500).send({ error: 'An error occurred while fetching products.' });
    }
});
// GET Product by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const product = await prisma.product.findUnique({
            where: { product_id: Number(id) },
        });
        if (!product || product.product_status === 0) {
            res.status(404).send({ error: 'Product not found.' });
            return;
        }
        res.send(product);
    }
    catch (err) {
        console.error('Error fetching product by ID:', err);
        res.status(500).send({ error: 'An error occurred while fetching the product.' });
    }
});
// UPDATE Product
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { product_name, product_price, product_status } = req.body;
        // Validasi Input
        if (!product_name || product_price == null || product_price < 0) {
            res.status(400).send({ error: 'Product name and a valid price are required.' });
            return;
        }
        const product = await prisma.product.update({
            where: { product_id: Number(id) },
            data: {
                product_name,
                product_price,
                product_status: product_status ?? 1,
            },
        });
        res.send({ message: 'Product updated successfully', data: product });
    }
    catch (err) {
        console.error('Error updating product:', err);
        res.status(500).send({ error: 'An error occurred while updating the product.' });
    }
});
// DELETE Product (Soft Delete)
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const product = await prisma.product.update({
            where: { product_id: Number(id) },
            data: { product_status: 0 }, // Menandai status produk sebagai tidak tersedia
        });
        if (!product) {
            res.status(404).send({ error: 'Product not found.' });
            return;
        }
        res.send({ message: 'Product deleted successfully' });
    }
    catch (err) {
        console.error('Error deleting product:', err);
        res.status(500).send({ error: 'An error occurred while deleting the product.' });
    }
});
exports.default = router;
