import { Router } from 'express';

// Import Routes
import customerRoutes from '../controllers/customerController';
import productRoutes from '../controllers/productController';
import orderRoutes from '../controllers/orderController';
import loginRoutes from '../controllers/loginController';
import userRoutes from '../controllers/userController';
import { authenticateToken } from "../middlewares/authenticateToken";
import { authorizeRole } from "../middlewares/authorizeRole";
import loginController from '../controllers/loginController';
import multer from "multer";
import path from "path";
import fs from "fs";

const router = Router();

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      // Tentukan folder tujuan di dalam proyek
      const uploadPath = path.join(process.cwd(), "src", "uploads");
      
      // Jika folder belum ada, buat foldernya
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }
  
      // Tentukan direktori tujuan untuk menyimpan file
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      // Simpan file dengan nama unik berdasarkan timestamp
      cb(null, `${Date.now()}${path.extname(file.originalname)}`);
    },
  });

const upload = multer({ storage });

// Customer's Routes
router.post("/customers", authenticateToken, authorizeRole("admin"), customerRoutes.create);
router.get("/customers", authenticateToken, authorizeRole(["admin", "user"]), customerRoutes.getAll);
router.get("/customers/:id", authenticateToken, authorizeRole("admin"), customerRoutes.getById);
router.put("/customers/:id", authenticateToken, authorizeRole("admin"), customerRoutes.update);
router.delete("/customers/:id", authenticateToken, authorizeRole("admin"), customerRoutes.delete);

//Category's Routes
router.post("/categories", authenticateToken, authorizeRole("admin"), productRoutes.createCategory);
router.get("/categories", authenticateToken, authorizeRole("admin"), productRoutes.getAllCategories );

// Product's Routes
router.post("/products", productRoutes.uploadMiddleware, authenticateToken, authorizeRole("admin"), productRoutes.create);
router.get("/products", authenticateToken, authorizeRole(["admin", "user"]),  productRoutes.getAll);
router.get("/products/:id", authenticateToken, authorizeRole("admin"), productRoutes.getById);
router.put("/products/:id", productRoutes.uploadMiddleware, authorizeRole("admin"), authenticateToken, productRoutes.update);
router.delete("/products/:id", authenticateToken, authorizeRole("admin"), productRoutes.delete);
router.get("/productsphoto/:filename", authorizeRole("admin"), authenticateToken, productRoutes.getUploadedFile);
router.get("/exportpdfproducts", authorizeRole("admin"), authenticateToken, productRoutes.exportToPDF);
router.get("/exportexcelproducts", authorizeRole("admin"), authenticateToken, productRoutes.exportToExcel);
router.get("/exportexcelproductstemplate", authorizeRole("admin"), authenticateToken, productRoutes.exportExcelTemplate);
router.post("/products-import", authorizeRole("admin"),  authenticateToken, productRoutes.uploadExcelMiddleware, productRoutes.uploadExcel);
router.post("/validate-import", authorizeRole("admin"),  authenticateToken, productRoutes.uploadExcelMiddleware, productRoutes.validateExcelFile);
  


// Order's Routes
router.post("/orders", authenticateToken, authorizeRole(["admin", "user"]), orderRoutes.createOrder);
router.get("/orders", authenticateToken, authorizeRole(["admin", "user"]),  orderRoutes.getAllOrders);
router.get("/orders/:id", authenticateToken, authorizeRole(["admin", "user"]),  orderRoutes.getOrderById);
router.get("/exportpdforders", authenticateToken, authorizeRole(["admin", "user"]),  orderRoutes.exportToPDF);

// Login's Routes
router.post("/register", loginController.register);
router.post("/login", loginController.login);

router.use('/users', userRoutes);

export default router;