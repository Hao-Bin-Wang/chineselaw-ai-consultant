import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // 管理员账号
  const adminPwd = await bcrypt.hash("admin123", 10);
  await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: { username: "admin", password: adminPwd, role: "admin" },
  });
  console.log("✅ Admin user: admin / admin123");

  // 普通用户账号
  const userPwd = await bcrypt.hash("user123", 10);
  await prisma.user.upsert({
    where: { username: "user" },
    update: {},
    create: { username: "user", password: userPwd, role: "user" },
  });
  console.log("✅ Normal user: user / user123");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
