import { Router } from "express"
import prisma from "../prisma"

const router = Router()

// CREATE SATUAN
router.post("/", async (req, res) => {
    try {
        const { nama, keterangan } = req.body

        if (!nama) {
            return res.status(400).json({ message: "Nama satuan wajib diisi" })
        }

        const satuan = await prisma.satuan.create({
            data: {
                nama,
                keterangan,
            },
        })

        res.status(201).json(satuan)
    } catch (error: any) {
        res.status(500).json({ message: error.message })
    }
})

// READ SATUAN
router.get("/", async (_req, res) => {
    try {
        const satuanList = await prisma.satuan.findMany({
            orderBy: {
                createdAt: 'desc'
            }
        })
        res.json(satuanList)
    } catch (error: any) {
        res.status(500).json({ message: error.message })
    }
})

// READ SATUAN BY ID
router.get("/:id", async (req, res) => {
    try {
        const id = Number(req.params.id)

        const satuan = await prisma.satuan.findUnique({
            where: { id },
        })

        if (!satuan) {
            return res.status(404).json({ message: "Satuan not found" })
        }

        res.json(satuan)
    } catch (error: any) {
        res.status(500).json({ message: error.message })
    }
})

// UPDATE SATUAN
router.put("/:id", async (req, res) => {
    try {
        const id = Number(req.params.id)
        const { nama, keterangan } = req.body

        const satuan = await prisma.satuan.update({
            where: { id },
            data: { nama, keterangan },
        })

        res.json(satuan)
    } catch (error: any) {
        res.status(500).json({ message: error.message })
    }
})

// DELETE SATUAN
router.delete("/:id", async (req, res) => {
    try {
        const id = Number(req.params.id)

        await prisma.satuan.delete({
            where: { id },
        })

        res.json({ message: "Satuan deleted successfully" })
    } catch (error: any) {
        res.status(500).json({ message: error.message })
    }
})

export default router
