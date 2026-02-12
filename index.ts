import "dotenv/config"
import express from "express"
import categoryRoute from "./routes/category.route"
import productRoute from "./routes/product.route"
import transactionRoute from "./routes/transaction.route"

const app = express()
app.use(express.json())

app.use("/api/categories", categoryRoute)
app.use("/api/products", productRoute)
app.use("/api/transactions", transactionRoute)

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000")
})