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

  const captchaValid = await verifyCaptcha(captchaToken, captchaCode);
  if (!captchaValid) {
    return NextResponse.json({ success: false, error: "验证码错误" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) {
    return NextResponse.json({ success: false, error: "账号或密码错误" }, { status: 401 });
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return NextResponse.json({ success: false, error: "账号或密码错误" }, { status: 401 });
  }

  const token = await generateToken(user.id, user.role);
  setAuthCookie(token);

  return NextResponse.json({ success: true, token, role: user.role });
}