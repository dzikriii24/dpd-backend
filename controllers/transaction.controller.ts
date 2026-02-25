import { Request, Response } from "express";
import prisma from "../prisma"; // Pastikan path ke prisma client lu bener

// 1. Ambil Semua Transaksi (Untuk Tabel di Transaksi.tsx)
export const getTransactions = async (req: Request, res: Response) => {
  try {
    const transactions = await prisma.transaction.findMany({
      include: {
        product: true, // Biar dapet Nama & Kode Barang
      },
      orderBy: {
        createdAt: "desc", // Yang terbaru di atas
      },
    });
    res.json(transactions);
  } catch (error: any) {
    res.status(500).json({ message: "Gagal mengambil riwayat transaksi" });
  }
};

// 2. Buat Transaksi Baru & Update Stok (Transactional)
export const createTransaction = async (req: Request, res: Response) => {
  try {
    const {
      productId,
      type, // 'IN' atau 'OUT'
      qty,
      source,
      destination,
      pic,
      note,
      userId,
    } = req.body;

    // Validasi input dasar
    if (!productId || !type || !qty) {
      return res.status(400).json({ message: "Product ID, tipe, dan jumlah wajib diisi" });
    }

    const productIdNumber = Number(productId);
    const qtyNumber = Number(qty);
    const userIdNumber = Number(userId || 1); // Fallback ke user ID 1 kalau gak dikirim

    // Cek produknya ada atau nggak
    const product = await prisma.product.findUnique({
      where: { id: productIdNumber },
    });

    if (!product) {
      return res.status(404).json({ message: "Produk tidak ditemukan" });
    }

    // Cek stok biar gak minus kalau barang keluar
    if (type === "OUT" && product.stock < qtyNumber) {
      return res.status(400).json({ message: `Stok tidak cukup! Sisa stok: ${product.stock}` });
    }

    // JALANKAN TRANSACTION: Simpan riwayat + Update stok
    const result = await prisma.$transaction(async (tx) => {
      // Simpan data transaksi
      const transaction = await tx.transaction.create({
        data: {
          type,
          qty: qtyNumber,
          source,
          destination,
          pic,
          note,
          product: { connect: { id: productIdNumber } },
          user: { connect: { id: userIdNumber } },
        },
      });

      // Update stok produk secara otomatis
      const newStock = type === "IN" 
        ? product.stock + qtyNumber 
        : product.stock - qtyNumber;

      await tx.product.update({
        where: { id: productIdNumber },
        data: { stock: newStock },
      });

      return transaction;
    });

    res.status(201).json(result);
  } catch (error: any) {
    console.error("Error Transaction:", error);
    res.status(500).json({ message: error.message || "Gagal memproses transaksi" });
  }
};