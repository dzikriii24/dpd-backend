import { Request, Response } from "express";
import * as userService from "../services/user.service";

export const login = async (req: Request, res: Response) => {
  try {
    // 1. Ambil data
    const { email, password } = req.body;

    // 2. Cek di terminal VS Code (bukan browser) apakah datanya muncul
    console.log("Body yang masuk ke Backend:", req.body);

    // 3. Lempar ke service
    const result = await userService.login(email, password);
    res.status(200).json(result);
  } catch (error: any) {
    // Kirim pesan error asli (misal: "User tidak ditemukan!")
    res.status(401).json({ message: error.message });
  }
};