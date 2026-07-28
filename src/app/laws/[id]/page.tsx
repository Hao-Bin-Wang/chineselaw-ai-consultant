import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { typeLabels, statusLabels, statusColors } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function LawDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const law = await prisma.legislation.findUnique({
    where: { id: params.id },
    include: {
      articles: {
        orderBy: { articleNumber: "asc" },
      },
    },
  });

  if (!law) notFound();

  const typeLabel = typeLabels[law.type] || law.type;
  const statusLabel = statusLabels[law.status] || law.status;
  const statusColor = statusColors[law.status] || "";

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* 返回链接 */}
      <Link
        href="/laws"
        className="inline-flex items-center text-sm text-text-secondary hover:text-[var(--gold)] transition-colors mb-6"
      >
        ← 返回检索
      </Link>

      {/* 标题 */}
      <h1 className="text-2xl font-display text-foreground mb-3">
        {law.title}
      </h1>

      {/* 元数据 */}
      <div className="flex flex-wrap items-center gap-3 text-sm text-text-secondary mb-8">
        <span className="px-2 py-0.5 rounded bg-[var(--muted)] text-xs">
          {typeLabel}
        </span>
        <span className={`px-2 py-0.5 rounded bg-[var(--muted)] text-xs ${statusColor}`}>
          {statusLabel}
        </span>
        {law.publisher && (
          <span>发布机构：{law.publisher}</span>
        )}
        <span>条文数：{law.articles.length}</span>
        {law.effectiveAt && (
          <span>施行日期：{new Date(law.effectiveAt).toLocaleDateString("zh-CN")}</span>
        )}
      </div>

      {/* 条文列表 */}
      <div className="space-y-3">
        {law.articles.map((article) => (
          <div
            key={article.id}
            className="border-l-[3px] border-l-[var(--gold)] bg-[var(--card)] rounded-r-lg px-4 py-3"
          >
            {article.chapter && (
              <p className="text-xs text-text-secondary mb-1">{article.chapter}</p>
            )}
            {article.section && (
              <p className="text-xs text-text-secondary mb-1">{article.section}</p>
            )}
            <p className="text-sm font-display text-[var(--gold)] mb-1">
              {article.articleNumber}
            </p>
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
              {article.content}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
