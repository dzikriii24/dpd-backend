import { Router }  from "express"
import prisma from "../prisma"

const router = Router()

/* ====================
   CREATE CATEGORY
===================== */
router.post("/", async (req, res) => {
    try {
        const { name, color } = req.body

        if(!name || !color) {
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

/* ======================
   UPDATE CATEGORY
====================== */
router.put("/:id", async (req, res) => {
        const id = Number(req.params.id)

        const category = await prisma.category.update({
            where: { id },
            data: req.body,
        })

        res.json(category)
})

/* ======================
   DELETE CATEGORY
====================== */
router.delete("/:id", async (req, res) => {
    const id = Number(req.params.id)

    await prisma.category.delete({
        where: { id },
    })

    res.json({ message: "Category deleted" })
})

export default router