import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { generateToken, setAuthCookie } from "@/lib/auth";
import { verifyCaptcha } from "@/lib/captcha";

export async function POST(req: NextRequest) {
  const { username, password, captchaToken, captchaCode } = await req.json();

  if (!username || !password || !captchaToken || !captchaCode) {
    return NextResponse.json({ success: false, error: "所有字段必填" }, { status: 400 });
  }

  if (username.length < 3 || username.length > 20) {
    return NextResponse.json({ success: false, error: "账号长度 3-20 个字符" }, { status: 400 });
  }

  if (password.length < 6) {
    return NextResponse.json({ success: false, error: "密码至少 6 位" }, { status: 400 });
  }

  const captchaValid = await verifyCaptcha(captchaToken, captchaCode);
  if (!captchaValid) {
    return NextResponse.json({ success: false, error: "验证码错误" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    return NextResponse.json({ success: false, error: "账号已存在" }, { status: 400 });
  }

  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { username, password: hashed, role: "user" },
  });

  const token = await generateToken(user.id, user.role);
  setAuthCookie(token);

  return NextResponse.json({ success: true, token, role: user.role });
}