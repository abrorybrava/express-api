"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const client_1 = require("@prisma/client");
const router = express_1.default.Router();
const prisma = new client_1.PrismaClient();
// CREATE Order
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
// READ Orders
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
exports.default = router;
