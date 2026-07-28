import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { ragQuery } from "@/lib/rag";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });
  }

  const { question } = await req.json();
  if (!question || question.trim().length === 0) {
    return NextResponse.json({ success: false, error: "问题不能为空" }, { status: 400 });
  }

  try {
    const { answer, citations } = await ragQuery(question.trim());

    await prisma.chatHistory.create({
      data: {
        userId: session.userId,
        question: question.trim(),
        answer,
        citations: citations as any,
      },
    });

    return NextResponse.json({ success: true, data: { answer, citations } });
  } catch (error: any) {
    console.error("Chat error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "AI 回答生成失败，请稍后重试" },
      { status: 500 }
    );
  }
}