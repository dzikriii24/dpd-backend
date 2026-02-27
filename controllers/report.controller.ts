import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import ExcelJS from "exceljs";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const prisma = new PrismaClient();

export const downloadReport = async (req: Request, res: Response) => {
  // Ambil parameter startDate dan endDate asli
  const { startDate, endDate, fileType, type } = req.query;

  try {
    // Parsing String ke Object Date
    const start = new Date(startDate as string);
    const end = new Date(endDate as string);
    end.setHours(23, 59, 59, 999); // Pastikan sampai penghujung hari yang dipilih

    // 2. Tarik data dari database berdasarkan range tanggal
    const transactions = await prisma.transaction.findMany({
      where: {
        createdAt: {
          gte: start,
          lte: end,
        },
        ...(type ? { type: type as any } : {}),
      },
      include: { product: { include: { category: true } } },
      orderBy: { createdAt: 'desc' },
    });

    // --- LOGIC EXCEL ---
    if (fileType === "xlsx") {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Laporan Inventaris");

      worksheet.columns = [
        { header: "Tanggal", key: "date", width: 20 },
        { header: "Tipe", key: "type", width: 15 },
        { header: "Kode Barang", key: "code", width: 15 },
        { header: "Nama Barang", key: "name", width: 30 },
        { header: "Jumlah", key: "qty", width: 10 },
        { header: "PIC", key: "pic", width: 20 },
        { header: "Catatan", key: "note", width: 30 },
      ];

      transactions.forEach((t) => {
        worksheet.addRow({
          date: t.createdAt.toLocaleDateString(),
          type: t.type === 'IN' ? 'Barang Masuk' : 'Barang Keluar',
          code: t.product.code,
          name: t.product.name,
          qty: t.type === 'IN' ? `+${t.qty}` : `-${t.qty}`,
          pic: t.pic || '-',
          note: t.note || '-',
        });
      });

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename=Laporan-Inventaris.xlsx`);

      await workbook.xlsx.write(res);
      return res.end();
    }

    // --- LOGIC PDF (ANTI-CORRUPT) ---
    if (fileType === "pdf") {
      const doc = new jsPDF();

      doc.setFontSize(18);
      doc.text("LAPORAN TRANSAKSI INVENTARIS", 14, 15);
      doc.setFontSize(11);
      const titleType = type === 'IN' ? 'Barang Masuk' : type === 'OUT' ? 'Barang Keluar' : 'Semua Transaksi';
      doc.text(`Periode: ${start.toLocaleDateString()} - ${end.toLocaleDateString()} | Tipe: ${titleType}`, 14, 22);

      autoTable(doc, {
        startY: 30,
        head: [["Tanggal", "Tipe", "Nama Barang", "QTY", "PIC"]],
        body: transactions.map((t) => [
          new Date(t.createdAt).toLocaleDateString(),
          t.type === 'IN' ? 'Masuk' : 'Keluar',
          t.product.name,
          t.type === 'IN' ? `+${t.qty}` : `-${t.qty}`,
          t.pic || '-',
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