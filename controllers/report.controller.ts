import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import ExcelJS from "exceljs";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const prisma = new PrismaClient();

export const downloadReport = async (req: Request, res: Response) => {
  // Ambil parameter dari frontend
  const { startMonth, endMonth, fileType } = req.query;

  try {
    // 1. Konversi format 'YYYY-MM' ke objek Date untuk filter Prisma
    const startDate = new Date(`${startMonth}-01T00:00:00Z`);
    const endDate = new Date(`${endMonth}-01T00:00:00Z`);
    endDate.setMonth(endDate.getMonth() + 1); // Tambah 1 bulan agar mencakup akhir bulan pilihannya

    // 2. Tarik data dari database berdasarkan range tanggal
    const products = await prisma.product.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lt: endDate,
        },
      },
      include: { category: true },
      orderBy: { createdAt: 'desc' }
    });

    // --- LOGIC EXCEL ---
    if (fileType === "xlsx") {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Laporan Inventaris");

      worksheet.columns = [
        { header: "Kode", key: "code", width: 15 },
        { header: "Nama Barang", key: "name", width: 30 },
        { header: "Kategori", key: "category", width: 20 },
        { header: "Stok", key: "stock", width: 10 },
        { header: "Tanggal Input", key: "date", width: 20 },
      ];

      products.forEach((p) => {
        worksheet.addRow({
          code: p.code,
          name: p.name,
          category: p.category.name,
          stock: p.stock,
          date: p.createdAt.toLocaleDateString(),
        });
      });

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename=Laporan-${startMonth}.xlsx`);
      
      await workbook.xlsx.write(res);
      return res.end();
    }

    // --- LOGIC PDF (ANTI-CORRUPT) ---
    if (fileType === "pdf") {
      const doc = new jsPDF();

      doc.setFontSize(18);
      doc.text("LAPORAN INVENTARIS BARANG", 14, 15);
      
      // CARA PANGGIL YANG BENER:
      autoTable(doc, {
        startY: 30,
        head: [["Kode", "Nama Barang", "Kategori", "Stok", "Tanggal"]],
        body: products.map((p) => [
          p.code,
          p.name,
          p.category.name,
          p.stock.toString(),
          new Date(p.createdAt).toLocaleDateString(),
        ]),
        headStyles: { fillColor: [37, 99, 235] },
      });

      const pdfOutput = doc.output("arraybuffer");
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename=Laporan.pdf`);

      return res.send(Buffer.from(pdfOutput));
    }

    return res.status(400).json({ message: "Format file tidak didukung" });

  } catch (error) {
    console.error("Error Report:", error);
    res.status(500).json({ message: "Gagal memproses laporan di server" });
  }
};