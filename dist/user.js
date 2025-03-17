"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const client_1 = require("@prisma/client");
const express_validator_1 = require("express-validator");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config(); // Gunakan dotenv untuk membaca SECRET_KEY
const prisma = new client_1.PrismaClient();
const router = express_1.default.Router();
const SECRET_KEY = process.env.SECRET_KEY || 'default_secret_key'; // Gunakan dari .env
// Middleware untuk menangani error validasi
// Middleware to handle validation errors
const handleValidationErrors = (req, res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
    }
    next(); // Ensure to call next() to proceed to the next middleware
};
// Login Route
router.post('/login', [
    (0, express_validator_1.body)('username').notEmpty().withMessage('Username is required'),
    (0, express_validator_1.body)('password').notEmpty().withMessage('Password is required'),
], handleValidationErrors, // Validation middleware
async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await prisma.user.findUnique({ where: { username } });
        if (!user) {
            res.status(404).send({ error: 'User not found' }); // Use res directly, don't return it
            return;
        }
        // Verify password
        const isPasswordValid = await bcrypt_1.default.compare(password, user.password);
        if (!isPasswordValid) {
            res.status(401).send({ error: 'Invalid credentials' }); // Use res directly
            return;
        }
        // Generate JWT token
        const token = jsonwebtoken_1.default.sign({ userId: user.id, role: user.role }, SECRET_KEY, {
            expiresIn: '1h',
        });
        res.send({ message: 'Login successful', token }); // Use res directly
    }
    catch (error) {
        console.error(error);
        res.status(500).send({ error: 'Login failed' }); // Use res directly
    }
});
// Login
router.post('/login', [
    (0, express_validator_1.body)('username').notEmpty().withMessage('Username is required'),
    (0, express_validator_1.body)('password').notEmpty().withMessage('Password is required'),
], handleValidationErrors, async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await prisma.user.findUnique({ where: { username } });
        if (!user) {
            res.status(404).send({ error: 'User not found' });
            return;
        }
        // Verifikasi password
        const isPasswordValid = await bcrypt_1.default.compare(password, user.password);
        if (!isPasswordValid) {
            res.status(401).send({ error: 'Invalid credentials' });
            return;
        }
        // Generate JWT token
        const token = jsonwebtoken_1.default.sign({ userId: user.id, role: user.role }, SECRET_KEY, {
            expiresIn: '1h',
        });
        res.send({ message: 'Login successful', token });
    }
    catch (error) {
        console.error(error);
        res.status(500).send({ error: 'Login failed' });
    }
});
exports.default = router;
