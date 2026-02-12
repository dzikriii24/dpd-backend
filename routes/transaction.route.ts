import { Router } from "express"
import prisma from "../prisma"
import { connect } from "node:http2"

const router = Router()

//CREATE TRANSACTION
router.post("/", async (req, res) => {
    try {
        const {
            productId,
            type, //IN OUT
            qty,
            source,
            destination,
            pic,
            note,
            userId,
        } = req.body

        if (!productId || !type || !qty) {
            return res.status(400).json({
                message: "wajib isi Product ID, tipe, dan jumlah"
            })
        }

        const productIdNumber = Number(productId)
        const qtyNumber = Number(qty)
        const userIdNumber = Number(userId)

        const product = await prisma.product.findUnique({
            where: { id: productIdNumber },
        })

        if (!product) {
            return res.status(404).json({ message: "Product not found" })
        }

        //biar stok ga minus
        if (type === "OUT" && product.stock < qtyNumber) {
            return res.status(400).json({
                message: "Stok tidak mencukupi",
            })
        }

        //TRANSAKSI 
        const result = await prisma.$transaction(async (tx) => {
            const transaction = await tx.transaction.create({
                data: {
                    type,
                    qty: qtyNumber,
                    source,
                    destination,
                    pic,
                    note,

                    product: {
                        connect: {
                            id: productIdNumber,
                        },
                    },

                    user: {
                        connect: { id: userIdNumber },
                    }
                },
            })

            await tx.product.update({
                where: { id: productId },
                data: {
                    stock:
                    type === "IN"
                    ? product.stock + qty
                    : product.stock - qty,
                },
            })

            return transaction
        })

        res.status(201).json(result)
    } catch (error: any) {
        res.status(500).json({ message: error.message })
    }
})

//READ ALL TRANSACTION
router.get("/", async (_req, res) => {
    const transactions  = await prisma.transaction.findMany({
        include: {
            product: true,
        },
        orderBy: { createdAt: "desc" },
    })

    res.json(transactions)
})

//READ BY PRODUCT
router.get("/product/:productId", async (req, res) => {
    const productId = Number(req.params.productId)

    const transactions = await prisma.transaction.findMany({
        where: { productId },
        orderBy: { createdAt: "desc" },
    })

    res.json(transactions)
})

export default router