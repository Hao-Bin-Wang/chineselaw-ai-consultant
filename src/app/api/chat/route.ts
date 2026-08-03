import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { ragQuery, ragQueryStream } from "@/lib/rag";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });
  }

  const { question, stream } = await req.json();
  if (!question || question.trim().length === 0) {
    return NextResponse.json({ success: false, error: "问题不能为空" }, { status: 400 });
  }

  const q = question.trim();

  // 流式模式
  if (stream) {
    const encoder = new TextEncoder();
    let fullAnswer = "";
    let finalCitations: any[] = [];

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          const { citations, tokenStream } = await ragQueryStream(q);

          finalCitations = citations;

          // 先发送 citations 元信息
          const meta = JSON.stringify({ type: "meta", citations });
          controller.enqueue(encoder.encode(`data: ${meta}\n\n`));

          // 逐 token 流式输出
          for await (const token of tokenStream) {
            fullAnswer += token;
            const payload = JSON.stringify({ type: "token", content: token });
            controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
          }

          // 保存到历史记录
          await prisma.chatHistory.create({
            data: {
              userId: session.userId,
              question: q,
              answer: fullAnswer,
              citations: finalCitations as any,
            },
          });

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        } catch (error: any) {
          console.error("Chat stream error:", error);
          const errPayload = JSON.stringify({ type: "error", message: error.message || "回答生成失败" });
          controller.enqueue(encoder.encode(`data: ${errPayload}\n\n`));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }

  // 非流式模式（向后兼容）
  try {
    const { answer, citations } = await ragQuery(q);

    await prisma.chatHistory.create({
      data: {
        userId: session.userId,
        question: q,
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
