import { getPrisma } from "@/lib/db/prisma";
import { hash } from "bcryptjs";
import { NextResponse } from "next/server";

const BCRYPT_ROUNDS = 12;

function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

export async function POST(req: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: "database_unconfigured" },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (body === null || typeof body !== "object") {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const o = body as Record<string, unknown>;
  const nickname =
    typeof o.nickname === "string" ? o.nickname.trim().slice(0, 64) : "";
  const emailRaw = typeof o.email === "string" ? o.email.trim() : "";
  const password = typeof o.password === "string" ? o.password : "";

  if (nickname.length < 2 || nickname.length > 32) {
    return NextResponse.json({ error: "nickname_length" }, { status: 400 });
  }

  const email = emailRaw.toLowerCase();
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "email_invalid" }, { status: 400 });
  }

  if (password.length < 8 || password.length > 128) {
    return NextResponse.json({ error: "password_length" }, { status: 400 });
  }

  try {
    const passwordHash = await hash(password, BCRYPT_ROUNDS);
    await getPrisma().user.create({
      data: {
        email,
        name: nickname,
        passwordHash,
      },
    });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e: unknown) {
    const code =
      typeof e === "object" && e !== null && "code" in e
        ? (e as { code?: string }).code
        : undefined;
    if (code === "P2002") {
      return NextResponse.json({ error: "email_taken" }, { status: 409 });
    }
    console.error(e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
