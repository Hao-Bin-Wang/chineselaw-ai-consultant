import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });
  }

  const record = await prisma.chatHistory.findUnique({
    where: { id: params.id },
  });

  if (!record) {
    return NextResponse.json({ success: false, error: "记录不存在" }, { status: 404 });
  }

  if (record.userId !== session.userId) {
    return NextResponse.json({ success: false, error: "无权限" }, { status: 403 });
  }

  await prisma.chatHistory.delete({ where: { id: params.id } });

  return NextResponse.json({ success: true });
}
