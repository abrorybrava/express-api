import { Request, Response } from "express";
import { PrismaClient } from "../../generated/db2";
import { createOrderSchema } from "../utils/validationSchema";
import PDFDocument from "pdfkit";
import { formatRupiahExportPDF, getWIB } from "../utils/helpers";
import multer from "multer";
import path from "path";
import fs from "fs";
import { number } from "yup";

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

export const uploadExcelMiddleware = upload.single("excel_file");
// Membuat order baru
const createOrder = async (req: Request, res: Response) => {
  const { customer_id, orderDetails } = req.body;

  // Validasi input menggunakan Yup Schema
  await createOrderSchema.validate(req.body, { abortEarly: false });

  if (!customer_id || !orderDetails || !orderDetails.length) {
    return res
      .status(400)
      .json({ error: "Customer ID and order details are required." });
  }

  try {
    // Hitung total harga dari order
    const totalPrice = orderDetails.reduce(
      (total: number, detail: { quantity: number; price_per_unit: number }) =>
        total + detail.quantity * Number(detail.price_per_unit),
      0
    );

    // Buat order dalam database
    const order = await prisma.order.create({
      data: {
        customer_id: Number(customer_id),
        total_price: totalPrice,
        order_date: getWIB(),
        created_at: getWIB(),
        created_by: "System", // Ubah sesuai user yang sedang login
        orderDetails: {
          create: orderDetails.map(
            (detail: {
              product_id: number;
              quantity: number;
              price_per_unit: number;
            }) => ({
              product_id: detail.product_id,
              quantity: detail.quantity,
              price_per_unit: detail.price_per_unit,
            })
          ),
        },
      },
      include: { orderDetails: true },
    });

    // Perbarui stok produk
    for (const detail of orderDetails) {
      const product = await prisma.product.findUnique({
        where: { product_id: detail.product_id },
      });

      if (!product)
        throw new Error(`Product with ID ${detail.product_id} not found.`);
      if (product.product_qty && product.product_qty < detail.quantity)
        throw new Error(
          `Not enough stock for product ID ${detail.product_id}.`
        );

      await prisma.product.update({
        where: { product_id: detail.product_id },
        data: { product_qty: (product.product_qty ?? 0) - detail.quantity },
      });
    }

    res
      .status(201)
      .json({ message: "Order created successfully", data: order });
  } catch (err) {
    console.error("Error creating order:", err);
    res
      .status(500)
      .json({
        error:
          err instanceof Error
            ? err.message
            : "An error occurred while creating the order.",
      });
  }
};

// Mendapatkan semua order
const getAllOrders = async (req: Request, res: Response) => {
  try {
    const orders = await prisma.order.findMany({
      orderBy: {
        created_at: "desc",
      },
      include: {
        customer: { select: { customer_name: true } },
        orderDetails: {
          include: { product: { select: { product_name: true } } },
        },
      },
    });

    const formattedOrders = orders.map((order) => ({
      order_id: order.order_id,
      customer_name: order.customer?.customer_name || "Unknown",
      order_date: order.order_date,
      total_price: order.total_price.toNumber(),
      details: order.orderDetails.map((detail) => ({
        product_name: detail.product?.product_name || "Unknown",
        quantity: detail.quantity,
        price_per_unit: detail.price_per_unit.toNumber(),
        total_price: detail.quantity * detail.price_per_unit.toNumber(),
      })),
    }));

    res.json(formattedOrders);
  } catch (err) {
    console.error("Error fetching orders:", err);
    res.status(500).json({ error: "An error occurred while fetching orders." });
  }
};

// Mendapatkan detail order berdasarkan ID
const getOrderById = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const orderDetails = await prisma.orderDetail.findMany({
      where: { order_id: Number(id) },
      include: { product: { select: { product_name: true } } },
    });

    if (!orderDetails.length) {
      return res.status(404).json({ error: "Order not found." });
    }

    const formattedDetails = orderDetails.map((detail) => ({
      order_detail_id: detail.order_detail_id,
      product_name: detail.product?.product_name || "Unknown",
      quantity: detail.quantity,
      price_per_unit: detail.price_per_unit.toNumber(),
      total_price: detail.quantity * detail.price_per_unit.toNumber(),
    }));

    res.json(formattedDetails);
  } catch (err) {
    console.error("Error fetching order by ID:", err);
    res
      .status(500)
      .json({ error: "An error occurred while fetching the order." });
  }
};

const exportToPDF = async (req: Request, res: Response) => {
  try {
    // Ambil tanggal dari query parameter
    const { startDate, endDate } = req.query;

    // Pastikan kedua tanggal ada
    if (!startDate || !endDate) {
      return res
        .status(400)
        .send({ error: "Tanggal mulai dan tanggal akhir diperlukan" });
    }

    // Convert start and end dates to Date objects
    const start = new Date(startDate as string); // Tanggal mulai
    const end = new Date(endDate as string); // Tanggal akhir

    // Set the time for the end date to 23:59:59.999 to include the whole last day
    end.setHours(23, 59, 59, 999);

    // Ambil data order berdasarkan rentang tanggal
    const orders = await prisma.order.findMany({
      where: {
        order_date: {
          gte: start,  // Tanggal mulai
          lte: end,    // Tanggal akhir (set to 23:59:59.999)
        },
      },
      include: {
        customer: true, // Include customer untuk menampilkan nama pelanggan
        orderDetails: true, // Include order details untuk menampilkan produk dan harga
      },
      orderBy: {
        order_date: "asc", // Urutkan berdasarkan tanggal order
      },
    });

    // Total harga dalam periode tersebut
    const totalSpending = orders.reduce(
      (sum, order) => sum + order.total_price.toNumber(),
      0
    );

    // Buat dokumen PDF
    const doc = new PDFDocument();

    // Atur header respons agar file terunduh
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "inline; filename=daftar_order.pdf");
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
      .text(`Daftar Order dari ${startDate} hingga ${endDate}`, {
        align: "center",
      });
    doc.moveDown(2); // Space

    // Definisi posisi tabel
    const startX = 90; // Posisi awal tabel
    const tableWidth = 420; // Lebar total tabel
    const columnWidths = [40, 180, 100, 100]; // Lebar kolom
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
    doc.text("Nama Pelanggan", startX + columnWidths[0], currentY + 5, {
      width: columnWidths[1],
      align: "center",
    });
    doc.text(
      "Tanggal Order",
      startX + columnWidths[0] + columnWidths[1],
      currentY + 5,
      { width: columnWidths[2], align: "center" }
    );
    doc.text(
      "Total Harga",
      startX + columnWidths[0] + columnWidths[1] + columnWidths[2],
      currentY + 5,
      { width: columnWidths[3], align: "center" }
    );
    currentY += rowHeight;
    drawHorizontalLine(currentY); // Garis bawah header
    drawVerticalLines(doc.y - rowHeight, doc.y); // Garis vertikal header

    // Isi tabel
    doc.fontSize(12).font("Helvetica");
    let no = 1;
    orders.forEach((order) => {
      drawVerticalLines(currentY, currentY + rowHeight); // Garis vertikal untuk baris data
      doc.text(`${no++}`, startX, currentY + 5, {
        width: columnWidths[0],
        align: "center",
      });
      doc.text(
        `${order.customer.customer_name}`,
        startX + columnWidths[0],
        currentY + 5,
        { width: columnWidths[1], align: "center" }
      );
      doc.text(
        `${order.order_date.toLocaleDateString("id-ID")}`,
        startX + columnWidths[0] + columnWidths[1],
        currentY + 5,
        { width: columnWidths[2], align: "center" }
      );
      doc.text(
        `${formatRupiahExportPDF(order.total_price.toString())}`,
        startX + columnWidths[0] + columnWidths[1] + columnWidths[2],
        currentY + 5,
        { width: columnWidths[3], align: "center" }
      );
      currentY += rowHeight; // Pindah ke baris berikutnya
      drawHorizontalLine(currentY); // Garis horizontal di bawah setiap baris
    });

    // Garis vertikal terakhir (menutup tabel)
    drawVerticalLines(currentY - rowHeight * orders.length + 2, currentY);

    // Menambahkan total belanja dalam periode
    currentY += rowHeight; // Space before the total row
    drawHorizontalLine(currentY); // Garis horizontal untuk total

    doc.fontSize(12).font("Helvetica-Bold");
    doc.text("Total Belanja", startX, currentY + 5, {
      width: columnWidths[0] + columnWidths[1] + columnWidths[2],
      align: "right",
    });
    doc.text(
      `${formatRupiahExportPDF(totalSpending.toString())}`,
      startX + columnWidths[0] + columnWidths[1] + columnWidths[2],
      currentY + 5,
      { width: columnWidths[3], align: "center" }
    );

    // Akhiri dokumen PDF
    doc.end();
  } catch (err) {
    console.error("Error generating PDF:", err);
    res
      .status(500)
      .send({ error: "An error occurred while generating the PDF." });
  }
};

export default { createOrder, getAllOrders, getOrderById, exportToPDF };
