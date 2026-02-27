import "dotenv/config"
import express from "express"
import cors from "cors"
import categoryRoute from "./routes/category.route"
import productRoute from "./routes/product.route"
import transactionRoute from "./routes/transaction.route"
import testRoute from "./routes/test.route"
import userRoute from "./routes/user.route"
import satuanRoute from "./routes/satuan.route"
import auditlogRoute from "./routes/auditlog.route"
import { getStats } from "./controllers/dashboard.controller";
import { downloadReport } from "./controllers/report.controller";

const app = express()
app.use(cors())
app.use(express.json())

app.use("/api/users", userRoute);
app.use("/api/categories", categoryRoute)
app.use("/api/products", productRoute)
app.use("/api/transactions", transactionRoute)
app.use("/api/satuan", satuanRoute)
app.use("/api/auditlogs", auditlogRoute)
app.use("/api/test", testRoute)

app.get("/api/dashboard/stats", getStats);
app.get("/api/reports/download", downloadReport);

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000")
})