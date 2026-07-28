import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const mode = searchParams.get("mode") || "legislation";
  const search = searchParams.get("search") || "";
  const type = searchParams.get("type") || "";
  const status = searchParams.get("status") || "";
  const publisher = searchParams.get("publisher") || "";
  const dateFrom = searchParams.get("dateFrom") || "";
  const dateTo = searchParams.get("dateTo") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = 20;

  // 条文搜索模式
  if (mode === "article") {
    const articleWhere: any = {};
    if (search) {
      articleWhere.content = { contains: search, mode: "insensitive" };
    }
    if (type || status || publisher || dateFrom || dateTo) {
      articleWhere.legislation = {};
      if (type) articleWhere.legislation.type = type;
      if (status) articleWhere.legislation.status = status;
      if (publisher) {
        articleWhere.legislation.publisher = { contains: publisher, mode: "insensitive" };
      }
      if (dateFrom || dateTo) {
        articleWhere.legislation.issuedAt = {};
        if (dateFrom) articleWhere.legislation.issuedAt.gte = new Date(dateFrom);
        if (dateTo) articleWhere.legislation.issuedAt.lte = new Date(dateTo);
      }
    }

    const [articles, total] = await Promise.all([
      prisma.article.findMany({
        where: articleWhere,
        include: {
          legislation: { select: { id: true, title: true, type: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.article.count({ where: articleWhere }),
    ]);

    return NextResponse.json({
      success: true,
      data: { articles, total, page, pageSize },
    });
  }

  // 法规搜索模式（默认）
  const where: any = {};
  if (type) where.type = type;
  if (status) where.status = status;
  if (publisher) {
    where.publisher = { contains: publisher, mode: "insensitive" };
  }
  if (dateFrom || dateTo) {
    where.issuedAt = {};
    if (dateFrom) where.issuedAt.gte = new Date(dateFrom);
    if (dateTo) where.issuedAt.lte = new Date(dateTo);
  }
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      {
        articles: {
          some: { content: { contains: search, mode: "insensitive" } },
        },
      },
    ];
  }

  const [legislations, total] = await Promise.all([
    prisma.legislation.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { _count: { select: { articles: true } } },
    }),
    prisma.legislation.count({ where }),
  ]);

  return NextResponse.json({
    success: true,
    data: { legislations, total, page, pageSize },
  });
}
