import { NextResponse } from "next/server";
import { generateCaptcha, saveCaptcha } from "@/lib/captcha";

export const dynamic = "force-dynamic";

export async function GET() {
  const captcha = await generateCaptcha();
  const token = await saveCaptcha(captcha.text);
  return NextResponse.json({ success: true, data: { svg: captcha.data, token } });
}