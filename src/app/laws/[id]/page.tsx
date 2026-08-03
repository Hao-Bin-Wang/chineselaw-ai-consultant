import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { typeLabels, statusLabels, statusBadgeClass } from "@/lib/constants";
import { ScrollToArticle } from "./scroll-to-article";
import { FavoriteButton } from "./favorite-button";
import { IconChevronLeft } from "@/components/icons";

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

  return (
    <div className="max-w-3xl mx-auto px-5 py-7">
      <ScrollToArticle />

      <Link href="/laws" className="btn btn-ghost h-8 px-2 text-sm -ml-2 mb-5">
        <IconChevronLeft size={15} />
        返回检索
      </Link>

      {/* 标题区 */}
      <header className="mb-7">
        <h1 className="text-[1.55rem] font-semibold leading-snug tracking-tight mb-3">
          {law.title}
        </h1>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="badge badge-accent">
            {typeLabels[law.type] || law.type}
          </span>
          <span className={`badge ${statusBadgeClass[law.status] ?? ""}`}>
            {statusLabels[law.status] || law.status}
          </span>
          <span style={{ color: "var(--fg-tertiary)" }}>
            共 {law.articles.length} 条
          </span>
          {law.publisher && (
            <span style={{ color: "var(--fg-tertiary)" }}>
              · {law.publisher}
            </span>
          )}
          {law.effectiveAt && (
            <span style={{ color: "var(--fg-tertiary)" }}>
              · {new Date(law.effectiveAt).toLocaleDateString("zh-CN")} 施行
            </span>
          )}
        </div>
      </header>

      {/* 条文列表 */}
      <div className="space-y-1">
        {law.articles.map((article) => (
          <article
            key={article.id}
            id={`article-${article.id}`}
            className="group scroll-mt-6 px-4 py-4 rounded-[var(--r-lg)]
                       hover:bg-[var(--bg-subtle)]"
          >
            {(article.chapter || article.section) && (
              <p
                className="text-[0.7rem] mb-1.5"
                style={{ color: "var(--fg-tertiary)" }}
              >
                {[article.chapter, article.section].filter(Boolean).join(" · ")}
              </p>
            )}

            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <p
                  className="text-[0.82rem] font-semibold mb-1.5"
                  style={{ color: "var(--accent)" }}
                >
                  {article.articleNumber}
                </p>
                <p className="text-[0.9rem] leading-[1.8] whitespace-pre-wrap">
                  {article.content}
                </p>
              </div>
              <div className="shrink-0 opacity-0 group-hover:opacity-100 focus-within:opacity-100">
                <FavoriteButton articleId={article.id} />
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
