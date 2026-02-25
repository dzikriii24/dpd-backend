import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// PASTIKAN ADA KATA 'export' DI DEPAN 'const'
export const getStats = async (req: Request, res: Response) => {
  try {
    const totalProducts = await prisma.product.count();
    const atkCount = await prisma.product.count({ where: { categoryId: 1 } });
    const kebersihanCount = await prisma.product.count({ where: { categoryId: 2 } });
    const lowStockItems = await prisma.product.findMany({
      where: { stock: { lt: 5 } },
    });

    res.json({ totalProducts, atkCount, kebersihanCount, lowStockItems });
  } catch (error) {
    res.status(500).json({ message: "Gagal ambil data stats" });
  }
};