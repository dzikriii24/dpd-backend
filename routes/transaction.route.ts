import { Router } from "express";
import prisma from "../prisma";

const router = Router();

// 1. CREATE TRANSACTION (Masuk/Keluar)
router.post("/", async (req, res) => {
  try {
    const {
      productId,
      type, // "IN" atau "OUT"
      qty,
      source,
      destination,
      pic,
      note,
      userId,
    } = req.body;

    // Validasi input
    if (!productId || !type || !qty) {
      return res.status(400).json({
        message: "Wajib isi Product ID, tipe (IN/OUT), dan jumlah (qty)",
      });
    }

    const productIdNumber = Number(productId);
    const qtyNumber = Number(qty);
    const userIdNumber = Number(userId || 1); // Fallback ke ID 1 jika tidak ada session

    // Ambil data produk untuk cek stok awal
    const product = await prisma.product.findUnique({
      where: { id: productIdNumber },
    });

    if (!product) {
      return res.status(404).json({ message: "Produk tidak ditemukan" });
    }

    // Validasi agar stok tidak minus jika barang keluar
    if (type === "OUT" && product.stock < qtyNumber) {
      return res.status(400).json({
        message: `Stok tidak mencukupi. Sisa stok saat ini: ${product.stock}`,
      });
    }

    // JALANKAN TRANSAKSI (Simpan riwayat + Update stok sekaligus)
    const result = await prisma.$transaction(async (tx) => {
      // Buat record transaksi
      const transaction = await tx.transaction.create({
        data: {
          type,
          qty: qtyNumber,
          source,
          destination,
          pic,
          note,
          product: {
            connect: { id: productIdNumber },
          },
          user: {
            connect: { id: userIdNumber },
          },
        },
      });

      // Update stok produk
      await tx.product.update({
        where: { id: productIdNumber },
        data: {
          stock:
            type === "IN"
              ? product.stock + qtyNumber // Pastikan pakai qtyNumber (angka)
              : product.stock - qtyNumber,
        },
      });

      return transaction;
    });

    res.status(201).json(result);
  } catch (error: any) {
    console.error("Error creating transaction:", error);
    res.status(500).json({ message: error.message });
  }
});

// 2. READ ALL TRANSACTIONS (Untuk tabel Transaksi.tsx)
router.get("/", async (_req, res) => {
  try {
    const transactions = await prisma.transaction.findMany({
      include: {
        product: true, // Biar nama barang muncul di tabel
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(transactions);
  } catch (error: any) {
    res.status(500).json({ message: "Gagal mengambil data transaksi" });
  }
});

// 3. READ BY PRODUCT (Opsional: buat history per barang)
router.get("/product/:productId", async (req, res) => {
  try {
    const productId = Number(req.params.productId);
    const transactions = await prisma.transaction.findMany({
      where: { productId },
      include: { product: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(transactions);
  } catch (error: any) {
    res.status(500).json({ message: "Gagal mengambil history produk" });
  }
});

export default router;