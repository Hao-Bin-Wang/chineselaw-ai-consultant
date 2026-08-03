import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

/** 添加条文到收藏夹 */
export async function POST(
  req: NextRequest,
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

  const { articleId } = await req.json();
  if (!articleId) {
    return NextResponse.json({ success: false, error: "缺少条文ID" }, { status: 400 });
  }

  const existing = await prisma.collectionItem.findUnique({
    where: { collectionId_articleId: { collectionId: params.id, articleId } },
  });
  if (existing) {
    return NextResponse.json({ success: false, error: "该条文已在收藏夹中" }, { status: 400 });
  }

  const item = await prisma.collectionItem.create({
    data: { collectionId: params.id, articleId },
  });

  return NextResponse.json({ success: true, data: item });
}

/** 从收藏夹移除条文 */
export async function DELETE(
  req: NextRequest,
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

  const { searchParams } = req.nextUrl;
  const itemId = searchParams.get("itemId");
  if (!itemId) {
    return NextResponse.json({ success: false, error: "缺少条目ID" }, { status: 400 });
  }

  await prisma.collectionItem.deleteMany({
    where: { id: itemId, collectionId: params.id },
  });

  return NextResponse.json({ success: true });
}
