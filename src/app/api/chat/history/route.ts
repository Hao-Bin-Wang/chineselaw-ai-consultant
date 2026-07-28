import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });
  }

  const conversations = await prisma.chatHistory.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      question: true,
      answer: true,
      citations: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ success: true, data: conversations });
}