import { Router } from "express";
import { login } from "../controllers/user.controller"; // Ambil dari controller lu

const router = Router();

// Biarkan controller yang menangani req.body.username
router.post("/login", login); 

export default router;