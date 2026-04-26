import { NextResponse } from "next/server";
import { generatePasskeyAuthenticationOptions } from "@/lib/auth/passkey/authentication";

export async function POST() {
  try {
    const options = await generatePasskeyAuthenticationOptions();
    return NextResponse.json(options);
  } catch {
    return NextResponse.json(
      { error: "認証オプションの生成に失敗しました" },
      { status: 500 }
    );
  }
}
