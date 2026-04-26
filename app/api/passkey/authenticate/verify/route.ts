import { NextRequest, NextResponse } from "next/server";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import type {
  AuthenticationResponseJSON,
  AuthenticatorTransportFuture,
} from "@simplewebauthn/server";
import { prisma } from "@/lib/db";
import { consumeChallenge } from "@/lib/auth/passkey/challenge";
import {
  findUserByCredentialId,
  updatePasskeyAfterAuth,
} from "@/lib/auth/passkey/authentication";
import { setSessionCookie } from "@/lib/auth/cookies";
import type { UserRole } from "@/lib/users/role";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { credential: AuthenticationResponseJSON };
  const { credential } = body;

  if (!credential) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const clientData = JSON.parse(
    Buffer.from(credential.response.clientDataJSON, "base64url").toString("utf-8")
  ) as { challenge: string };
  const challenge = clientData.challenge;

  try {
    await consumeChallenge(challenge, "authentication");
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

  const credentialId = credential.id;
  const passkey = await prisma.passkey.findUnique({
    where: { credentialId },
    select: { publicKey: true, counter: true, transports: true },
  });
  if (!passkey) {
    return NextResponse.json({ error: "パスキーが見つかりません" }, { status: 404 });
  }

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response: credential,
      expectedChallenge: challenge,
      expectedOrigin: process.env.ORIGIN ?? "http://localhost:3000",
      expectedRPID: process.env.RP_ID ?? "localhost",
      credential: {
        id: credentialId,
        publicKey: new Uint8Array(passkey.publicKey),
        counter: Number(passkey.counter),
        transports: passkey.transports as AuthenticatorTransportFuture[],
      },
    });
  } catch {
    return NextResponse.json({ error: "パスキーの検証に失敗しました" }, { status: 400 });
  }

  if (!verification.verified) {
    return NextResponse.json({ error: "パスキーの検証に失敗しました" }, { status: 400 });
  }

  const { newCounter } = verification.authenticationInfo;
  const userInfo = await findUserByCredentialId(credentialId);
  await updatePasskeyAfterAuth(credentialId, BigInt(newCounter));
  await setSessionCookie(userInfo.userId, userInfo.role as UserRole);

  return NextResponse.json({ verified: true });
}
