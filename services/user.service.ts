import prisma from "../prisma";

export const login = async (username: string, password: string) => {
  // 0. Proteksi Tambahan: Pastikan username ada isinya sebelum diproses Prisma
  if (!username) {
    throw new Error("Username tidak boleh kosong!");
  }

  // 1. Cari user berdasarkan username
  const user = await prisma.user.findUnique({
    where: { username: username }, // Di sini titik errornya kalau username = undefined
  });

  // 2. Cek apakah user ada
  if (!user) {
    throw new Error("User tidak ditemukan!");
  }

  // 3. Cek password
  if (user.password !== password) {
    throw new Error("Password salah!");
  }

  // 4. Balikin data tanpa password
  const { password: _, ...userWithoutPassword } = user;
  return {
    message: "Login Berhasil",
    user: userWithoutPassword,
    token: "ini_token_dummy_nanti_pake_jwt" 
  };
};