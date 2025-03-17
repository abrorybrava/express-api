"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const client_1 = require("@prisma/client");
const router = express_1.default.Router();
const prisma = new client_1.PrismaClient();
// CREATE Order with Order Details
router.post('/', async (req, res) => {
    const { customer_id, orderDetails } = req.body;
    if (!customer_id || !orderDetails || !orderDetails.length) {
        res.status(400).send({ error: 'Customer ID and order details are required.' });
        return;
    }
    try {
        // Calculate total price
        const totalPrice = orderDetails.reduce((total, detail) => total + detail.quantity * detail.price_per_unit, 0);
        // Create the main order
        const order = await prisma.order.create({
            data: {
                customer_id: Number(customer_id),
                total_price: totalPrice,
                order_date: new Date(),
                orderDetails: {
                    create: orderDetails.map((detail) => ({
                        product_id: detail.product_id,
                        quantity: detail.quantity,
                        price_per_unit: detail.price_per_unit,
                    })),
                },
            },
            include: {
                orderDetails: true,
            },
        });
        res.status(201).send({ message: 'Order created successfully', data: order });
    }
    catch (err) {
        console.error('Error creating order:', err);
        res.status(500).send({ error: 'An error occurred while creating the order.' });
    }
});
// READ all Orders with Order Details
router.get('/', async (req, res) => {
    try {
        const orders = await prisma.order.findMany({
            include: {
                customer: {
                    select: { customer_name: true },
                },
                orderDetails: {
                    include: {
                        product: {
                            select: { product_name: true },
                        },
                    },
                },
            },
        });
        const formattedOrders = orders.map((order) => ({
            order_id: order.order_id,
            customer_name: order.customer?.customer_name || 'Unknown',
            order_date: order.order_date,
            total_price: order.total_price,
            details: order.orderDetails.map((detail) => ({
                product_name: detail.product?.product_name || 'Unknown',
                quantity: detail.quantity,
                price_per_unit: detail.price_per_unit,
                total_price: detail.quantity * detail.price_per_unit.toNumber(),
            })),
        }));
        res.send(formattedOrders);
    }
    catch (err) {
        console.error('Error fetching orders:', err);
        res.status(500).send({ error: 'An error occurred while fetching orders.' });
    }
});
// GET Order by ID with Details
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const orderDetails = await prisma.orderDetail.findMany({
            where: { order_id: Number(id) },
            include: {
                product: {
                    select: { product_name: true },
                },
            },
        });
        if (!orderDetails.length) {
            res.status(404).send({ error: 'Order not found.' });
            return;
        }
        const formattedDetails = orderDetails.map((detail) => ({
            order_detail_id: detail.order_detail_id,
            product_name: detail.product?.product_name || 'Unknown',
            quantity: detail.quantity,
            price_per_unit: detail.price_per_unit,
            total_price: detail.quantity * detail.price_per_unit.toNumber(),
        }));
        res.send(formattedDetails);
    }
    catch (err) {
        console.error('Error fetching order by ID:', err);
        res.status(500).send({ error: 'An error occurred while fetching the order.' });
    }
});
// UPDATE Order and Order Details
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { customer_id, orderDetails } = req.body;
    if (!customer_id || !orderDetails || !orderDetails.length) {
        res.status(400).send({ error: 'Customer ID and order details are required.' });
        return;
    }
    try {
        // Calculate total price
        const totalPrice = orderDetails.reduce((total, detail) => total + detail.quantity * detail.price_per_unit, 0);
        // Update the main order
        const order = await prisma.order.update({
            where: { order_id: Number(id) },
            data: {
                customer_id: Number(customer_id),
                total_price: totalPrice,
                orderDetails: {
                    deleteMany: {}, // Clear existing order details
                    create: orderDetails.map((detail) => ({
                        product_id: detail.product_id,
                        quantity: detail.quantity,
                        price_per_unit: detail.price_per_unit,
                    })),
                },
            },
            include: {
                orderDetails: true,
            },
        });
        res.send({ message: 'Order updated successfully', data: order });
    }
    catch (err) {
        console.error('Error updating order:', err);
        res.status(500).send({ error: 'An error occurred while updating the order.' });
    }
});
exports.default = router;
