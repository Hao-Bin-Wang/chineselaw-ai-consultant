import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

/** 获取用户所有收藏夹 */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });
  }

  const collections = await prisma.collection.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { items: true } } },
  });

  return NextResponse.json({ success: true, data: collections });
}

/** 创建收藏夹 */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });
  }

  const { name } = await req.json();
  if (!name || name.trim().length === 0) {
    return NextResponse.json({ success: false, error: "收藏夹名称不能为空" }, { status: 400 });
  }

  const existing = await prisma.collection.findUnique({
    where: { userId_name: { userId: session.userId, name: name.trim() } },
  });
  if (existing) {
    return NextResponse.json({ success: false, error: "已存在同名收藏夹" }, { status: 400 });
  }

  const collection = await prisma.collection.create({
    data: { userId: session.userId, name: name.trim() },
  });

  return NextResponse.json({ success: true, data: collection });
}
