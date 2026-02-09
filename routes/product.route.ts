import { Router } from "express"
import prisma from "../prisma"

const router = Router()

//CREATE PRODUCT
router.post("/", async (req, res) => {
    try {
        const { 
            code,
            name,  
            categoryId,
            unit,
            stock,
            stockMin,
            description,
        } = req.body

        if (!code || !name || !categoryId) {
            return res.status(404).json({ message: "wajib isi code, nama, dan categoryId" })
        }

        const product = await prisma.product.create({
            data: {
                code,
                name,
                categoryId,
                unit,
                stock,
                stockMin,
                description,
                isActive: true,
            },
        })

        res.status(201).json(product)
    } catch (error: any) {
        res.status(500).json({ message: error.message })
    }
})

//READ PRODUCT
router.get("/", async (_req, res) => {
    try {
        const products = await prisma.product.findMany({
            include: {
                category: true,
            },
        })

        res.json(products)
    } catch (error: any) {
        res.status(500).json({ message: error.message })
    }
})

//READ PRODUCT BY ID
router.get("/:id", async (req, res) => {
    try {
        const id = Number(req.params.id)

        const product = await prisma.product.findUnique({
            where: { id },
            include: {
                category: true,
            },
        })

        if (!product) {
            return res.status(404).json({
                message: "Product not found",
            })
        }

        res.json(product)
    } catch (error: any) {
        res.status(500).json({ message: error.message })
    }
})

//UPDATE PRODUCT
router.put("/:id", async (req, res) => {
    try {
        const id = Number(req.params.id)

        const product = await prisma.product.update({
            where: { id },
            data: req.body,
        })

        res.json(product)
    } catch (error: any) {
        res.status(500).json({ message: error.message })
    }
})

//DELETE PRODUCT
router.delete("/:id", async (req, res) => {
    try {
        const id = Number(req.params.id)

        await prisma.product.delete({
            where: { id },
        })

        res.json({ message: "Product deleted" })
    } catch (error: any) {
        res.status(500).json({ message: error.message })
    }
})

export default router