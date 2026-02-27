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

    // Generate chart data for last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const recentTransactions = await prisma.transaction.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      select: { type: true, qty: true, createdAt: true }
    });

    const chartMap: Record<string, { name: string, masuk: number, keluar: number }> = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date(sevenDaysAgo);
      d.setDate(d.getDate() + i);
      const dateStr = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
      chartMap[dateStr] = { name: dateStr, masuk: 0, keluar: 0 };
    }

    recentTransactions.forEach(t => {
      const dateStr = t.createdAt.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
      if (chartMap[dateStr]) {
        if (t.type === 'IN') chartMap[dateStr].masuk += t.qty;
        if (t.type === 'OUT') chartMap[dateStr].keluar += t.qty;
      }
    });

    const chartData = Object.values(chartMap);

    res.json({ totalProducts, atkCount, kebersihanCount, lowStockItems, chartData });
  } catch (error) {
    res.status(500).json({ message: "Gagal ambil data stats" });
  }
};