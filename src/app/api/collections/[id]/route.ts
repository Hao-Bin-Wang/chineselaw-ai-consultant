import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

/** 获取收藏夹详情（含条文） */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });
  }

  const collection = await prisma.collection.findUnique({
    where: { id: params.id },
    include: {
      items: {
        include: {
          article: {
            include: { legislation: { select: { title: true, type: true } } },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!collection) {
    return NextResponse.json({ success: false, error: "收藏夹不存在" }, { status: 404 });
  }
  if (collection.userId !== session.userId) {
    return NextResponse.json({ success: false, error: "无权限" }, { status: 403 });
  }

  return NextResponse.json({ success: true, data: collection });
}

/** 删除收藏夹 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });
  }

  const collection = await prisma.collection.findUnique({
    where: { id: params.id },
  });
  if (!collection) {
    return NextResponse.json({ success: false, error: "收藏夹不存在" }, { status: 404 });
  }
  if (collection.userId !== session.userId) {
    return NextResponse.json({ success: false, error: "无权限" }, { status: 403 });
  }

  await prisma.collection.delete({ where: { id: params.id } });

  return NextResponse.json({ success: true });
}
