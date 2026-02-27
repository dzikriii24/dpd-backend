import prisma from "../prisma";

export const login = async (email: string, password: string) => {
  // 0. Proteksi Tambahan: Pastikan email ada isinya sebelum diproses Prisma
  if (!email) {
    throw new Error("Email tidak boleh kosong!");
  }

  // 1. Cari user berdasarkan email
  const user = await prisma.user.findUnique({
    where: { email: email }, // Di sini titik errornya kalau email = undefined
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