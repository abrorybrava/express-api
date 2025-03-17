import express, { Request, Response } from "express";
import multer from "multer";
import { PrismaClient } from "../../generated/db2";
import path from "path";
import fs from "fs";
import { productSchema } from "../utils/validationSchema";
import { formatRupiahExportPDF, getWIB } from "../utils/helpers";
import PDFDocument from "pdfkit";
import xlsx from "xlsx";
import { error } from "console";
import ExcelJS from "exceljs";

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL_DB2 } },
});

// Set up multer storage
const uploadPath = path.join(process.cwd(), "src", "uploads");
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}${path.extname(file.originalname)}`);
  },
});

const upload = multer({ storage });

const productController = {
  uploadMiddleware: upload.array("product_img", 5), // Mendukung hingga 5 gambar
  uploadExcelMiddleware: upload.single("excel_file"),

  create: async (req: Request, res: Response) => {
    try {
      const {
        product_name,
        product_price,
        product_qty,
        product_status,
        categories,
      } = req.body;
      const user = (req as any).user;

      if (!user || !user.userId) {
        return res
          .status(401)
          .json({ error: "Unauthorized. User information is missing." });
      }

      // Validate product data
      await productSchema.validate(req.body);

      // Validate categories array
      if (!Array.isArray(categories) || categories.length === 0) {
        return res
          .status(400)
          .json({ error: "Categories are required and must be an array." });
      }

      // Extract image paths from uploaded files
      const productImgPaths = req.files
        ? (req.files as Express.Multer.File[]).map(
            (file) => `/uploads/${file.filename}`
          )
        : [];

      // Create product in the database
      const product = await prisma.product.create({
        data: {
          product_name,
          product_price: parseFloat(product_price),
          product_qty: parseInt(product_qty, 10),
          product_status: parseInt(product_status, 10) || 1,
          created_at: getWIB(),
          created_by: user.name,
        },
      });

      // Link product with categories in the product_category table
      const productCategoriesData = categories.map((category_id: number) => ({
        product_id: product.product_id,
        category_id: parseFloat(category_id.toString()),
      }));

      await prisma.productCategory.createMany({
        data: productCategoriesData,
      });

      // Save product images if any
      if (productImgPaths.length > 0) {
        const productPictures = productImgPaths.map((imgPath) => ({
          product_id: product.product_id,
          prodpict_url: imgPath,
        }));

        await prisma.productPicture.createMany({
          data: productPictures,
        });
      }

      res.status(201).json({
        message: "Product and categories linked successfully",
        data: product,
      });
    } catch (err) {
      console.error("Error creating product:", err);
      res.status(500).json({ error: "Failed to create product" });
    }
  },

  // Get All Products
  getAll: async (_req: Request, res: Response) => {
    try {
      const products = await prisma.product.findMany({
        where: { product_status: 1 },
        orderBy: { created_at: "desc" },
        include: {
          productPictures: true,
          productCategories: {
            // Join ke tabel product_category
            include: {
              category: true, // Ambil data dari tabel category terkait
            },
          },
        },
      });

      const formattedProducts = products.map((product) => ({
        ...product,
        categories: product.productCategories.map((pc) => pc.category),
      }));

      res.json(formattedProducts);
    } catch (err) {
      console.error("Error fetching products:", err);
      res.status(500).json({ error: "Failed to fetch products" });
    }
  },

  // Get Product by ID
  getById: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const product = await prisma.product.findUnique({
        where: { product_id: Number(id) },
        include: { productPictures: true },
      });

      if (!product || product.product_status === 0) {
        return res.status(404).json({ error: "Product not found." });
      }

      res.json(product);
    } catch (err) {
      console.error("Error fetching product by ID:", err);
      res.status(500).json({ error: "Failed to fetch product" });
    }
  },

  // Update Product
  update: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const {
        product_name,
        product_price,
        product_qty,
        product_status,
        categories,
      } = req.body;
      const user = (req as any).user;

      // Validasi input
      await productSchema.validate(req.body);

      // Cek apakah produk ada
      const existingProduct = await prisma.product.findUnique({
        where: { product_id: Number(id) },
        include: {
          productPictures: true, // Ambil data gambar lama
          productCategories: true, // Ambil data kategori lama
        },
      });

      if (!existingProduct) {
        return res.status(404).json({ error: "Product not found." });
      }

      // Ambil path gambar baru dari file yang diunggah, jika ada
      const productImgPaths = req.files
        ? (req.files as Express.Multer.File[]).map(
            (file) => `/uploads/${file.filename}`
          )
        : [];

      // Update produk utama
      const updatedProduct = await prisma.product.update({
        where: { product_id: Number(id) },
        data: {
          product_name,
          product_price: parseFloat(product_price),
          product_qty: parseInt(product_qty, 10),
          product_status: parseInt(product_status, 10),
          modified_at: getWIB(),
          modified_by: user.name,
        },
      });

      // Update gambar jika ada input baru, jika tidak biarkan gambar lama
      if (productImgPaths.length > 0) {
        // Hapus gambar lama
        await prisma.productPicture.deleteMany({
          where: { product_id: updatedProduct.product_id },
        });

        // Simpan gambar baru
        const productPictures = productImgPaths.map((imgPath) => ({
          product_id: updatedProduct.product_id,
          prodpict_url: imgPath,
        }));
        await prisma.productPicture.createMany({ data: productPictures });
      }

      // Update kategori jika ada input baru, jika tidak biarkan kategori lama
      if (categories && categories.length > 0) {
        // Hapus kategori lama
        await prisma.productCategory.deleteMany({
          where: { product_id: updatedProduct.product_id },
        });

        // Simpan kategori baru
        const productCategories = categories.map((category_id: number) => ({
          product_id: updatedProduct.product_id,
          category_id,
        }));
        await prisma.productCategory.createMany({ data: productCategories });
      }

      res.json({
        message: "Product updated successfully",
        data: updatedProduct,
      });
    } catch (err) {
      console.error("Error updating product:", err);
      res.status(500).json({ error: "Failed to update product" });
    }
  },

  // Delete Product
  delete: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const product = await prisma.product.update({
        where: { product_id: Number(id) },
        data: { product_status: 0 },
      });

      if (!product) {
        res.status(404).send({ error: "Product not found." });
        return;
      }

      res.send({ message: "Product deleted successfully" });
    } catch (err: any) {
      console.error("Error deleting product:", err);
      res.status(500).json({ error: "Failed to delete product" });
    }
  },

  createCategory: async (req: Request, res: Response) => {
    try {
      const { category_name } = req.body;

      // // Validate category data
      // await categorySchema.validate(req.body);

      // Create category in the database
      const category = await prisma.category.create({
        data: {
          category_name,
        },
      });

      res
        .status(201)
        .json({ message: "Category created successfully", data: category });
    } catch (err) {
      console.error("Error creating category:", err);
      res.status(500).json({ error: "Failed to create category" });
    }
  },

  getAllCategories: async (req: Request, res: Response) => {
    try {
      const categories = await prisma.category.findMany({
        orderBy: {
          category_name: "asc",
        },
      });
      res.send(categories);
    } catch (err) {
      console.error("Error fetching categories:", err);
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  },

  // Get Uploaded File
  getUploadedFile: (req: Request, res: Response) => {
    const { filename } = req.params;
    const filePath = path.join(uploadPath, filename);

    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.status(404).json({ error: "File not found" });
    }
  },

  //Export All Data Product
  exportToPDF: async (req: Request, res: Response) => {
    try {
      // Ambil data produk
      const products = await prisma.product.findMany({
        where: { product_status: 1 },
        orderBy: { product_name: "asc" },
      });

      // Buat dokumen PDF
      const doc = new PDFDocument();

      // Atur header respons agar file terunduh
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        "inline; filename=daftar_produk.pdf"
      );
      res.setHeader("Access-Control-Allow-Origin", "http://localhost:3000");
      res.setHeader("Access-Control-Allow-Methods", "GET");
      res.setHeader(
        "Access-Control-Allow-Headers",
        "Authorization, Content-Type"
      );

      // Hubungkan aliran PDF ke respons
      doc.pipe(res);

      // Format tanggal
      const tglHariIni = new Date().toLocaleDateString("id-ID", {
        year: "numeric",
        month: "long",
        day: "numeric",
        weekday: "long",
      });

      // Set header PDF
      doc
        .font("Helvetica-Bold")
        .fontSize(18)
        .text(`Daftar Produk pada ${tglHariIni}`, { align: "center" });
      doc.moveDown(2); // Space

      // Definisi posisi tabel
      const startX = 50; // Posisi awal tabel
      const tableWidth = 500; // Lebar total tabel
      const columnWidths = [40, 180, 100, 80, 100]; // Lebar kolom
      const rowHeight = 20; // Tinggi baris
      let currentY = doc.y; // Posisi vertikal awal

      // Fungsi menggambar garis horizontal
      const drawHorizontalLine = (y: number) => {
        doc
          .moveTo(startX, y)
          .lineTo(startX + tableWidth, y)
          .stroke();
      };

      // Fungsi menggambar garis vertikal
      const drawVerticalLines = (yStart: number, yEnd: number) => {
        let xPos = startX;
        columnWidths.forEach((width) => {
          doc.moveTo(xPos, yStart).lineTo(xPos, yEnd).stroke();
          xPos += width;
        });
        // Garis vertikal terakhir
        doc.moveTo(xPos, yStart).lineTo(xPos, yEnd).stroke();
      };

      // Header Tabel
      drawHorizontalLine(currentY); // Garis atas header
      doc.fontSize(12).font("Helvetica-Bold");
      doc.text("No", startX, currentY + 5, {
        width: columnWidths[0],
        align: "center",
      });
      doc.text("Nama Produk", startX + columnWidths[0], currentY + 5, {
        width: columnWidths[1],
        align: "center",
      });
      doc.text(
        "Harga Satuan",
        startX + columnWidths[0] + columnWidths[1],
        currentY + 5,
        { width: columnWidths[2], align: "center" }
      );
      doc.text(
        "Jumlah",
        startX + columnWidths[0] + columnWidths[1] + columnWidths[2],
        currentY + 5,
        { width: columnWidths[3], align: "center" }
      );
      doc.text(
        "Status",
        startX +
          columnWidths[0] +
          columnWidths[1] +
          columnWidths[2] +
          columnWidths[3],
        currentY + 5,
        { width: columnWidths[4], align: "center" }
      );
      currentY += rowHeight;
      drawHorizontalLine(currentY); // Garis bawah header
      drawVerticalLines(doc.y - rowHeight, doc.y); // Garis vertikal header

      // Isi tabel
      doc.fontSize(12).font("Helvetica");
      let no = 1;
      products.forEach((product) => {
        drawVerticalLines(currentY, currentY + rowHeight); // Garis vertikal untuk baris data
        doc.text(`${no++}`, startX, currentY + 5, {
          width: columnWidths[0],
          align: "center",
        });
        doc.text(
          `${product.product_name}`,
          startX + columnWidths[0],
          currentY + 5,
          { width: columnWidths[1], align: "center" }
        );
        doc.text(
          `${formatRupiahExportPDF(product.product_price.toString())}`,
          startX + columnWidths[0] + columnWidths[1],
          currentY + 5,
          { width: columnWidths[2], align: "center" }
        );
        doc.text(
          `${product.product_qty}`,
          startX + columnWidths[0] + columnWidths[1] + columnWidths[2],
          currentY + 5,
          { width: columnWidths[3], align: "center" }
        );
        doc.text(
          `${product.product_status === 1 ? "Tersedia" : "Nonaktif"}`,
          startX +
            columnWidths[0] +
            columnWidths[1] +
            columnWidths[2] +
            columnWidths[3],
          currentY + 5,
          { width: columnWidths[4], align: "center" }
        );
        currentY += rowHeight; // Pindah ke baris berikutnya
        drawHorizontalLine(currentY); // Garis horizontal di bawah setiap baris
      });

      // Garis vertikal terakhir (menutup tabel)
      drawVerticalLines(currentY - rowHeight * products.length, currentY);

      // Akhiri dokumen PDF
      doc.end();
    } catch (err) {
      console.error("Error generating PDF:", err);
      res
        .status(500)
        .send({ error: "An error occurred while generating the PDF." });
    }
  },

  exportExcelTemplate: async (req: Request, res: Response) => {
    try {
      // Ambil daftar kategori yang ada di database
      const categories = await prisma.category.findMany({
        select: {
          category_id: true,
          category_name: true,
        },
      });

      // Buat workbook dan worksheet
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Template Produk");

      // Tambahkan header tabel
      const headerRow = worksheet.addRow([
        "Product Name", // Nama produk
        "Product Price", // Harga produk
        "Quantity", // Jumlah produk
        "Status", // Status produk
        "Categories (ID)", // Kategori produk (ID kategori dari database)
      ]);

      // Style untuk header tabel
      headerRow.eachCell((cell) => {
        cell.font = { bold: true };
        cell.alignment = { vertical: "middle", horizontal: "center" };
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      });

      // Tambahkan contoh data di baris berikutnya
      worksheet.addRow([
        "Example Product",
        100000,
        10,
        "Tersedia",
        "1,2",
        "",
        "Notes : ",
        `Kategori yang tersedia: ${categories
          .map((c) => `${c.category_id} - ${c.category_name}`)
          .join(", ")}`,
          "Status: Tersedia/Nonaktif"
      ]);
      worksheet.addRow([
        "Example Product 2",
        150000,
        5,
        "Nonaktif",
        "2",
      ]);

      // Atur lebar kolom agar otomatis
      worksheet.columns.forEach((column) => {
        column.width = column.header ? column.header.toString().length + 5 : 15;
      });

      // Atur header respons agar file terunduh
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=template_import_produk.xlsx"
      );

      // Kirim file Excel sebagai respons
      await workbook.xlsx.write(res);
      res.end();
    } catch (err) {
      console.error("Error generating Excel template:", err);
      res.status(500).send({
        error: "An error occurred while generating the Excel template.",
      });
    }
  },

  uploadExcel: async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      // Membaca file Excel
      const filePath = req.file.path;
      const workbook = xlsx.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const data = xlsx.utils.sheet_to_json(sheet);

      // Mendapatkan informasi user
      const user = (req as any).user;

      if (!user || !user.userId) {
        return res
          .status(401)
          .json({ error: "Unauthorized. User information is missing." });
      }

      // Ambil semua kategori dari database untuk validasi kategori
      const existingCategories = await prisma.category.findMany();
      const validCategoryIds = existingCategories.map((cat) => cat.category_id);

      // Ambil semua nama produk yang sudah ada di database
      const existingProducts = await prisma.product.findMany({
        select: { product_name: true },
      });
      const existingProductNames = existingProducts.map((p) =>
        p.product_name.toLowerCase()
      );

      const productData = data.map((row: any, index: number) => {
        const categories = row["Categories (ID)"]
          ? row["Categories (ID)"]
              .toString()
              .split(",")
              .map((catId: string) => parseInt(catId.trim(), 10))
          : [];

        return {
          rowNumber: index + 1, // Tambahkan nomor baris untuk pesan error
          product_name: row["Product Name"]?.trim(),
          product_price: parseFloat(row["Product Price"]),
          product_qty: parseInt(row["Quantity"], 10),
          product_status: row["Status"] === "Tersedia" ? 1 : 0,
          categories,
          created_at: getWIB(),
          created_by: user.name,
        };
      });

      // Simpan produk ke database jika semua validasi lolos
      for (const product of productData) {
        const createdProduct = await prisma.product.create({
          data: {
            product_name: product.product_name,
            product_price: product.product_price,
            product_qty: product.product_qty,
            product_status: product.product_status,
            created_at: product.created_at,
            created_by: product.created_by,
          },
        });

        // Link product dengan categories di tabel product_category
        const productCategoriesData = product.categories.map(
          (category_id: number) => ({
            product_id: createdProduct.product_id,
            category_id: category_id,
          })
        );

        await prisma.productCategory.createMany({
          data: productCategoriesData,
        });
      }

      // Hapus file setelah selesai
      fs.unlinkSync(filePath);

      res.status(200).json({
        message: "Products successfully uploaded and saved to the database.",
      });
    } catch (err) {
      console.error("Error uploading Excel:", err);
      res.status(500).json({
        error: "An error occurred while uploading the Excel file.",
      });
    }
  },

  validateExcelFile: async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      // Membaca file Excel
      const filePath = req.file.path;
      const workbook = xlsx.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const data = xlsx.utils.sheet_to_json(sheet);

      // Mendapatkan informasi user
      const user = (req as any).user;

      if (!user || !user.userId) {
        return res
          .status(401)
          .json({ error: "Unauthorized. User information is missing." });
      }

      // Ambil semua kategori dari database untuk validasi kategori
      const existingCategories = await prisma.category.findMany();
      const validCategoryIds = existingCategories.map((cat) => cat.category_id);

      // Ambil semua nama produk yang sudah ada di database
      const existingProducts = await prisma.product.findMany({
        select: { product_name: true },
        where: {product_status: 1}
      });
      const existingProductNames = existingProducts.map((p) =>
        p.product_name.toLowerCase()
      );

      const productData = data.map((row: any, index: number) => {
        const categories = row["Categories (ID)"]
          ? row["Categories (ID)"]
              .toString()
              .split(",")
              .map((catId: string) => parseInt(catId.trim(), 10))
          : [];

        return {
          rowNumber: index + 1, // Tambahkan nomor baris untuk pesan error
          product_name: row["Product Name"]?.trim(),
          product_price: parseFloat(row["Product Price"]),
          product_qty: parseInt(row["Quantity"], 10),
          product_status: row["Status"] === "Tersedia" ? 1 : 0,
          categories,
          created_at: getWIB(),
          created_by: user.name,
        };
      });

      // Validasi setiap baris
      const errors: { row: number; message: string }[] = [];
      const uniqueProductNames = new Set<string>(); // Untuk mengecek duplikasi dalam file Excel

      for (const product of productData) {
        const rowNumber = product.rowNumber;

        // Validasi kolom-kolom yang diperlukan
        if (!product.product_name || product.product_name === "") {
          errors.push({ row: rowNumber, message: "Product Name is required." });
        }
        if (isNaN(product.product_price) || product.product_price <= 0) {
          errors.push({
            row: rowNumber,
            message: "Product Price must be a positive number.",
          });
        }
        if (isNaN(product.product_qty) || product.product_qty < 0) {
          errors.push({
            row: rowNumber,
            message: "Quantity must be a non-negative integer.",
          });
        }

        // Validasi kategori ID
        for (const categoryId of product.categories) {
          if (!validCategoryIds.includes(categoryId)) {
            errors.push({
              row: rowNumber,
              message: `Invalid Category ID (${categoryId}). Make sure it exists in the database.`,
            });
          }
        }

        // Cek duplikasi nama produk dalam file
        if (product.product_name) {
          if (uniqueProductNames.has(product.product_name.toLowerCase())) {
            errors.push({
              row: rowNumber,
              message: `Duplicate Product Name in file: ${product.product_name}.`,
            });
          } else {
            uniqueProductNames.add(product.product_name.toLowerCase());
          }

          // Cek duplikasi nama produk dengan database
          if (
            existingProductNames.includes(product.product_name.toLowerCase())
          ) {
            errors.push({
              row: rowNumber,
              message: `Duplicate Product Name in database: ${product.product_name}.`,
            });
          }
        }

        // Validasi schema jika tidak ada error pada baris ini
        if (!errors.some((e) => e.row === rowNumber)) {
          try {
            await productSchema.validate(product);
          } catch (schemaError: any) {
            errors.push({ row: rowNumber, message: schemaError.message });
          }
        }
      }

      // Jika ada error, kirim respon JSON berisi daftar error
      if (errors.length > 0) {
        return res.status(400).json({
          error: "Validation errors occurred.",
          errors,
        });
      }

      // Jika semua validasi sukses
      return res.status(200).json({ message: "File is valid!" });
    } catch (err) {
      console.error("Error uploading Excel:", err);
      return res.status(500).json({
        error: "An error occurred while uploading the Excel file.",
      });
    }
  },

  exportToExcel: async (req: Request, res: Response) => {
    try {
      // Ambil data produk
      const products = await prisma.product.findMany({
        where: { product_status: 1 },
        orderBy: { product_name: "asc" },
      });

      // Buat workbook dan worksheet
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Daftar Produk");

      // Tambahkan judul dokumen
      worksheet.mergeCells("A1", "E1");
      const titleCell = worksheet.getCell("A1");
      titleCell.value = "Daftar Produk";
      titleCell.font = { size: 16, bold: true };
      titleCell.alignment = { vertical: "middle", horizontal: "center" };

      // Tambahkan tanggal di bawah judul
      worksheet.mergeCells("A2", "E2");
      const dateCell = worksheet.getCell("A2");
      const tglHariIni = new Date().toLocaleDateString("id-ID", {
        year: "numeric",
        month: "long",
        day: "numeric",
        weekday: "long",
      });
      dateCell.value = `Tanggal: ${tglHariIni}`;
      dateCell.font = { italic: true };
      dateCell.alignment = { vertical: "middle", horizontal: "center" };

      // Tambahkan header tabel
      worksheet.addRow([]);
      const headerRow = worksheet.addRow([
        "No",
        "Nama Produk",
        "Harga Satuan",
        "Jumlah",
        "Status",
      ]);

      // Style untuk header tabel
      headerRow.eachCell((cell) => {
        cell.font = { bold: true };
        cell.alignment = { vertical: "middle", horizontal: "center" };
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      });

      // Tambahkan data produk
      let no = 1;
      products.forEach((product) => {
        const row = worksheet.addRow([
          no++,
          product.product_name,
          formatRupiahExportPDF(product.product_price.toString()),
          product.product_qty,
          product.product_status === 1 ? "Tersedia" : "Nonaktif",
        ]);

        // Style untuk data baris
        row.eachCell((cell) => {
          cell.alignment = { vertical: "middle", horizontal: "center" };
          cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
          };
        });
      });

      // Atur lebar kolom agar otomatis
      worksheet.columns.forEach((column) => {
        column.width = column.header ? column.header.toString().length + 5 : 15;
      });

      // Atur header respons agar file terunduh
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=daftar_produk.xlsx"
      );

      // Kirim file Excel sebagai respons
      await workbook.xlsx.write(res);
      res.end();
    } catch (err) {
      console.error("Error generating Excel:", err);
      res
        .status(500)
        .send({ error: "An error occurred while generating the Excel file." });
    }
  },
};

export default productController;
