import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const search = searchParams.get("search") || "";
  const type = searchParams.get("type") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = 20;

  const where: any = {};
  if (type) where.type = type;
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