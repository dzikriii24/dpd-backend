import { Router } from "express";
import { login } from "../controllers/user.controller";
import prisma from "../prisma";

const router = Router();

// Biarkan controller yang menangani req.body.username
router.post("/login", login);

// READ ALL USERS
router.get("/", async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            orderBy: { createdAt: "desc" }
        });
        // Remove password from response
        const safeUsers = users.map(({ password, ...user }) => user);
        res.json(safeUsers);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

// READ USER BY ID
router.get("/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);
        const user = await prisma.user.findUnique({ where: { id } });
        if (!user) return res.status(404).json({ message: "User not found" });
        const { password, ...safeUser } = user;
        res.json(safeUser);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

// CREATE USER
router.post("/", async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        if (!name || !email || !password || !role) {
            return res.status(400).json({ message: "Semua kolom wajib diisi" });
        }

        // Check email
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ message: "Email sudah digunakan" });
        }

        const newUser = await prisma.user.create({
            data: { name, email, password, role, isActive: true }
        });

        const { password: _, ...safeUser } = newUser;
        res.status(201).json(safeUser);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

// UPDATE USER
router.put("/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { name, email, password, role, isActive } = req.body;

        // Build update data safely
        const data: any = {};
        if (name) data.name = name;
        if (email) data.email = email;
        if (password) data.password = password; // Only update if provided
        if (role) data.role = role;
        if (isActive !== undefined) data.isActive = isActive;

        const user = await prisma.user.update({
            where: { id },
            data
        });

        const { password: _, ...safeUser } = user;
        res.json(safeUser);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

// DELETE USER
router.delete("/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);

        // Prevent deleting the last admin
        const userToDelete = await prisma.user.findUnique({ where: { id } });
        if (!userToDelete) return res.status(404).json({ message: "User not found" });

        if (userToDelete.role === 'admin') {
            const adminCount = await prisma.user.count({ where: { role: 'admin' } });
            if (adminCount <= 1) {
                return res.status(400).json({ message: "Tidak dapat menghapus admin terakhir" });
            }
        }

        await prisma.user.delete({ where: { id } });
        res.json({ message: "User deleted successfully" });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

export default router;