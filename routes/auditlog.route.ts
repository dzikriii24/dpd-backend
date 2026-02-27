import { Router } from "express";
import prisma from "../prisma";

const router = Router();

// GET all activity logs
router.get("/", async (_req, res) => {
    try {
        const logs = await prisma.auditLog.findMany({
            include: {
                user: { select: { name: true, email: true, role: true } }
            },
            orderBy: { createdAt: "desc" },
            take: 200 // Limit to recent 200 logs to prevent huge payload
        });
        res.json(logs);
    } catch (error: any) {
        console.error("Error fetching audit logs:", error);
        res.status(500).json({ message: "Gagal mengambil log aktivitas." });
    }
});

export default router;
