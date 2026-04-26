/**
 * E2E テスト用シードデータ
 * 実行: npm run db:seed
 *
 * E2E_*_ID / E2E_*_PASSWORD は .env.local で定義する。
 * 未設定の場合はデフォルト値を使用する。
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const SALT_ROUNDS = 12;

async function main() {
  const users = [
    {
      userId: process.env.E2E_ADMIN_ID ?? "e2e-admin",
      email: "e2e-admin@e2e.local",
      password: process.env.E2E_ADMIN_PASSWORD ?? "E2eTest@admin1",
      role: "Admin" as const,
    },
    {
      userId: process.env.E2E_EDITOR_ID ?? "e2e-editor",
      email: "e2e-editor@e2e.local",
      password: process.env.E2E_EDITOR_PASSWORD ?? "E2eTest@editor1",
      role: "Editor" as const,
    },
    {
      userId: process.env.E2E_VIEWER_ID ?? "e2e-viewer",
      email: "e2e-viewer@e2e.local",
      password: process.env.E2E_VIEWER_PASSWORD ?? "E2eTest@viewer1",
      role: "Viewer" as const,
    },
  ];

  for (const user of users) {
    const hashedPassword = await bcrypt.hash(user.password, SALT_ROUNDS);
    await prisma.user.upsert({
      where: { userId: user.userId },
      update: { password: hashedPassword, role: user.role },
      create: {
        userId: user.userId,
        email: user.email,
        password: hashedPassword,
        role: user.role,
      },
    });
    console.log(`Upserted user: ${user.userId} (${user.role})`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
