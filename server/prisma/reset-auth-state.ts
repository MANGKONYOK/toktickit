import bcrypt from "bcryptjs";
import { getPrisma } from "../src/prisma.js";

async function main() {
  const prisma = getPrisma();
  const hash = await bcrypt.hash("Password@2026", 10);
  await prisma.user.updateMany({
    where: { email: "bob.smith@email.com" },
    data: { passwordHash: hash, mustChangePassword: true },
  });
  console.log("Bob Smith auth state reset successfully");
}

main().catch(console.error);
