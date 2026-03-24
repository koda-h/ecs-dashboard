"use server";

import { redirect } from "next/navigation";
import { deleteSessionCookie } from "@/lib/auth/cookies";

export async function logoutAction(): Promise<void> {
  await deleteSessionCookie();
  redirect("/login");
}
