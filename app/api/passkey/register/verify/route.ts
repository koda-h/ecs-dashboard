import { NextRequest, NextResponse } from "next/server";
import { verifyRegistrationResponse } from "@simplewebauthn/server";
import type { RegistrationResponseJSON } from "@simplewebauthn/server";
import { getSessionFromCookie } from "@/lib/auth/cookies";
import { prisma } from "@/lib/db";
import { consumeChallenge } from "@/lib/auth/passkey/challenge";
import { storePasskey } from "@/lib/auth/passkey/registration";

export async function POST(req: NextRequest) {
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

  const body = (await req.json()) as {
    credential: RegistrationResponseJSON;
    name: string;
  };
  const { credential, name } = body;

  if (!credential || !name) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const clientData = JSON.parse(
    Buffer.from(credential.response.clientDataJSON, "base64url").toString("utf-8")
  ) as { challenge: string };
  const challenge = clientData.challenge;

  try {
    const { userId: challengeUserId } = await consumeChallenge(challenge, "registration");
    if (challengeUserId !== user.id) {
      return NextResponse.json({ error: "チャレンジの検証に失敗しました" }, { status: 400 });
    }
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "Challenge expired") {
        return NextResponse.json(
          { error: "チャレンジの有効期限が切れています" },
          { status: 400 }
        );
      }
      if (err.message === "Challenge not found") {
        return NextResponse.json({ error: "無効なチャレンジです" }, { status: 400 });
      }
    }
    return NextResponse.json({ error: "チャレンジの検証に失敗しました" }, { status: 400 });
  }

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response: credential,
      expectedChallenge: challenge,
      expectedOrigin: process.env.ORIGIN ?? "http://localhost:3000",
      expectedRPID: process.env.RP_ID ?? "localhost",
    });
  } catch {
    return NextResponse.json({ error: "パスキーの検証に失敗しました" }, { status: 400 });
  }

  if (!verification.verified || !verification.registrationInfo) {
    return NextResponse.json({ error: "パスキーの検証に失敗しました" }, { status: 400 });
  }

  const { credential: cred, credentialDeviceType, credentialBackedUp } =
    verification.registrationInfo;

  try {
    await storePasskey(user.id, name, {
      credentialId: cred.id,
      publicKey: cred.publicKey,
      counter: cred.counter,
      deviceType: credentialDeviceType,
      backedUp: credentialBackedUp,
      transports: credential.response.transports ?? [],
    });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "Passkey limit reached") {
        return NextResponse.json(
          { error: "パスキーの登録上限に達しています" },
          { status: 409 }
        );
      }
      if (
        err.message === "Passkey name is required" ||
        err.message === "Passkey name is too long"
      ) {
        return NextResponse.json({ error: err.message }, { status: 400 });
      }
    }
    return NextResponse.json({ error: "パスキーの保存に失敗しました" }, { status: 500 });
  }

  return NextResponse.json({ verified: true });
}
