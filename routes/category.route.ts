import { Router } from "express"
import prisma from "../prisma"

const router = Router()

/* ====================
   CREATE CATEGORY
===================== */
router.post("/", async (req, res) => {
    try {
        const { name, color } = req.body

        if (!name || !color) {
            return res.status(400).json({
                message: "masukkan nama dan warna"
            })
        }

        const category = await prisma.category.create({
            data: {
                name,
                color,
                isActive: true,
            },
        })

        const user = await prisma.user.findFirst();
        if (user) {
            await prisma.auditLog.create({
                data: {
                    action: "CREATE_CATEGORY",
                    tableName: "Category",
                    description: `Menambahkan kategori baru: ${category.name}`,
                    userId: user.id
                }
            })
        }

        res.status(201).json(category)
    } catch (error: any) {
        res.status(500).json({ message: error.message })
    }
})
/* ======================
   READ CATEGORY
====================== */
router.get("/", async (_req, res) => {
    const categories = await prisma.category.findMany()
    res.json(categories)
})

router.get("/:id", async (req, res) => {
    try {
        const id = Number(req.params.id)
        const category = await prisma.category.findUnique({ where: { id } })
        if (!category) return res.status(404).json({ message: "Not found" })
        res.json(category)
    } catch (error: any) {
        res.status(500).json({ message: error.message })
    }
})

/* ======================
   UPDATE CATEGORY
====================== */
router.put("/:id", async (req, res) => {
    const id = Number(req.params.id)

    const category = await prisma.category.update({
        where: { id },
        data: req.body,
    })

    const user = await prisma.user.findFirst();
    if (user) {
        await prisma.auditLog.create({
            data: {
                action: "UPDATE_CATEGORY",
                tableName: "Category",
                description: `Memperbarui kategori: ${category.name}`,
                userId: user.id
            }
        })
    }

    res.json(category)
})

/* ======================
   DELETE CATEGORY
====================== */
router.delete("/:id", async (req, res) => {
    try {
        const id = Number(req.params.id)

        const categoryToDel = await prisma.category.findUnique({ where: { id } });

        await prisma.category.delete({
            where: { id },
        })

        if (categoryToDel) {
            const user = await prisma.user.findFirst();
            if (user) {
                await prisma.auditLog.create({
                    data: {
                        action: "DELETE_CATEGORY",
                        tableName: "Category",
                        description: `Menghapus kategori: ${categoryToDel.name}`,
                        userId: user.id
                    }
                })
            }
        }

        res.json({ message: "Category deleted" })
    } catch (error: any) {
        res.status(500).json({ message: error.message })
    }
})

export default router