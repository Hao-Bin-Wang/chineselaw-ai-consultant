import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const legislation = await prisma.legislation.findUnique({
    where: { id: params.id },
    include: {
      articles: {
        select: {
          id: true,
          chapter: true,
          section: true,
          articleNumber: true,
          content: true,
        },
      },
    },
  });

  if (!legislation) {
    return NextResponse.json({ success: false, error: "法规不存在" }, { status: 404 });
  }

  // Sort articles by extracting numeric part from articleNumber
  const sorted = {
    ...legislation,
    articles: legislation.articles.sort((a: any, b: any) => {
      const numA = parseInt(a.articleNumber.replace(/[^0-9]/g, "")) || 0;
      const numB = parseInt(b.articleNumber.replace(/[^0-9]/g, "")) || 0;
      return numA - numB;
    }),
  };

  return NextResponse.json({ success: true, data: sorted });
}