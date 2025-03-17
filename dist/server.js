"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const body_parser_1 = __importDefault(require("body-parser"));
const cors_1 = __importDefault(require("cors"));
// Import Routes
const customer_js_1 = __importDefault(require("./customer.js"));
const product_js_1 = __importDefault(require("./product.js"));
const order_js_1 = __importDefault(require("./order.js"));
const app = (0, express_1.default)();
const port = 2700;
// Middleware
app.use(body_parser_1.default.json());
app.use((0, cors_1.default)());
// Routes
app.use('/customers', customer_js_1.default);
app.use('/products', product_js_1.default);
app.use('/orders', order_js_1.default);
// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send({ error: 'Something went wrong!' });
});
// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
