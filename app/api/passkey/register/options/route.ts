import { NextResponse } from "next/server";
import { getSessionFromCookie } from "@/lib/auth/cookies";
import { prisma } from "@/lib/db";
import { generatePasskeyRegistrationOptions } from "@/lib/auth/passkey/registration";

export async function POST() {
  const session = await getSessionFromCookie();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { userId: session.userId },
    select: { id: true },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  try {
    const options = await generatePasskeyRegistrationOptions(user.id);
    return NextResponse.json(options);
  } catch (err) {
    if (err instanceof Error && err.message === "Passkey limit reached") {
      return NextResponse.json(
        { error: "パスキーの登録上限に達しています" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "パスキー登録オプションの生成に失敗しました" },
      { status: 500 }
    );
  }
}
