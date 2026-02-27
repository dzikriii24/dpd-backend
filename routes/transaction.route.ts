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
    let userIdNumber = Number(userId || 1);

    // Pastikan user ada, jika tidak, pakai user pertama (fallback untuk FK constraint bypass di local bypass)
    let checkUser = await prisma.user.findUnique({ where: { id: userIdNumber } });
    if (!checkUser) {
      const firstUser = await prisma.user.findFirst();
      if (!firstUser) {
        // Create an automatic fallback user if DB is completely empty
        checkUser = await prisma.user.create({
          data: {
            name: "System Admin",
            email: "admin@system.local",
            password: "defaultpassword",
            role: "admin",
            isActive: true
          }
        });
        userIdNumber = checkUser.id;
      } else {
        userIdNumber = firstUser.id;
      }
    }

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

    // JALANKAN TRANSAKSI (Simpan riwayat + Update stok + Audit Log sekaligus)
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
              ? product.stock + qtyNumber
              : product.stock - qtyNumber,
        },
      });

      // Buat Audit Log
      await tx.auditLog.create({
        data: {
          action: type === "IN" ? "TRANSACTION_IN" : "TRANSACTION_OUT",
          tableName: "Transaction",
          description: `Mencatat transaksi ${type === "IN" ? "masuk" : "keluar"} sebanyak ${qtyNumber} untuk barang ${product.name} (${product.code}). PIC: ${pic || '-'}`,
          user: {
            connect: { id: userIdNumber }
          }
        }
      });

      return transaction;
    });

    res.status(201).json(result);
  } catch (error: any) {
    console.error("Error creating transaction:", error);
    res.status(500).json({ message: error.message || "Gagal membuat transaksi" });
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

// 4. READ BY ID (Untuk TransactionDetail.tsx)
router.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: { product: true },
    });

    if (!transaction) {
      return res.status(404).json({ message: "Transaksi tidak ditemukan" });
    }

    res.json(transaction);
  } catch (error: any) {
    res.status(500).json({ message: "Gagal mengambil detail transaksi" });
  }
});

// 5. UPDATE TRANSACTION
router.put("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { productId, type, qty, source, destination, pic, note, userId } = req.body;

    const qtyNumber = Number(qty);
    const productIdNumber = Number(productId);
    let userIdNumber = Number(userId || 1);

    // Get fallback user if not exist
    let checkUser = await prisma.user.findUnique({ where: { id: userIdNumber } });
    if (!checkUser) {
      const firstUser = await prisma.user.findFirst();
      if (firstUser) userIdNumber = firstUser.id;
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Get old transaction
      const oldTx = await tx.transaction.findUnique({ where: { id } });
      if (!oldTx) throw new Error("Transaksi tidak ditemukan");

      // 2. Revert old stock
      await tx.product.update({
        where: { id: oldTx.productId },
        data: {
          stock: { increment: oldTx.type === 'IN' ? -oldTx.qty : oldTx.qty }
        }
      });

      // 3. Get new product to validate stock if OUT
      const newProduct = await tx.product.findUnique({ where: { id: productIdNumber } });
      if (!newProduct) throw new Error("Produk baru tidak ditemukan");

      if (type === "OUT" && newProduct.stock < qtyNumber) {
        throw new Error(`Stok produk tidak mencukupi. Sisa stok: ${newProduct.stock}`);
      }

      // 4. Update transaction
      const updatedTx = await tx.transaction.update({
        where: { id },
        data: {
          type,
          qty: qtyNumber,
          source,
          destination,
          pic,
          note,
          productId: productIdNumber,
        }
      });

      // 5. Apply new stock
      await tx.product.update({
        where: { id: productIdNumber },
        data: {
          stock: { increment: type === 'IN' ? qtyNumber : -qtyNumber }
        }
      });

      // 6. Audit log
      await tx.auditLog.create({
        data: {
          action: "UPDATE_TRANSACTION",
          tableName: "Transaction",
          description: `Memperbarui transaksi #${id} menjadi ${type} sejumlah ${qtyNumber}`,
          userId: userIdNumber
        }
      });

      return updatedTx;
    });

    res.json(result);
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Gagal memperbarui transaksi" });
  }
});

// 6. DELETE TRANSACTION
router.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    await prisma.$transaction(async (tx) => {
      const oldTx = await tx.transaction.findUnique({ where: { id }, include: { product: true } });
      if (!oldTx) throw new Error("Transaksi tidak ditemukan");

      // Revert stock
      await tx.product.update({
        where: { id: oldTx.productId },
        data: {
          stock: { increment: oldTx.type === 'IN' ? -oldTx.qty : oldTx.qty }
        }
      });

      // Delete transaction
      await tx.transaction.delete({ where: { id } });

      // Audit Log
      const user = await tx.user.findFirst();
      if (user) {
        await tx.auditLog.create({
          data: {
            action: "DELETE_TRANSACTION",
            tableName: "Transaction",
            description: `Menghapus transaksi ${oldTx.type} sejumlah ${oldTx.qty} untuk produk ${oldTx.product.name}`,
            userId: user.id
          }
        });
      }
    });

    res.json({ message: "Transaksi berhasil dihapus" });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Gagal menghapus transaksi" });
  }
});

export default router;