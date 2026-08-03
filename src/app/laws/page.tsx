"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { typeLabels, statusLabels } from "@/lib/constants";
import { highlightKeywords } from "@/lib/utils";
import {
  IconSearch,
  IconStar,
  IconClose,
  IconChevronLeft,
  IconFolder,
  IconSpinner,
} from "@/components/icons";

interface Legislation {
  id: string;
  title: string;
  type: string;
  status: string;
  publisher: string;
  _count: { articles: number };
}

interface ArticleResult {
  id: string;
  articleNumber: string;
  content: string;
  chapter: string | null;
  section: string | null;
  legislation: {
    id: string;
    title: string;
    type: string;
  };
}

interface Collection {
  id: string;
  name: string;
  _count: { items: number };
}

interface CollectionDetail extends Collection {
  items: {
    id: string;
    article: {
      id: string;
      articleNumber: string;
      content: string;
      chapter: string | null;
      section: string | null;
      legislation: { id: string; title: string; type: string };
    };
  }[];
}

const TYPE_KEYS = ["", "law", "regulation", "judicial_interpretation", "rule"];

const STATUS_BADGE: Record<string, string> = {
  effective: "badge-success",
  amended: "badge-warning",
  repealed: "badge-danger",
};

export default function LawsPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"legislation" | "article">("legislation");
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [publisher, setPublisher] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [legislations, setLegislations] = useState<Legislation[]>([]);
  const [articles, setArticles] = useState<ArticleResult[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  // 收藏夹弹层
  const [favOpen, setFavOpen] = useState(false);
  const [favCollections, setFavCollections] = useState<Collection[]>([]);
  const [favLoading, setFavLoading] = useState(false);
  const [favNotLoggedIn, setFavNotLoggedIn] = useState(false);
  const [selectedCollection, setSelectedCollection] =
    useState<CollectionDetail | null>(null);
  const [collectionLoading, setCollectionLoading] = useState(false);

  const fetchLaws = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("mode", mode);
    if (search) params.set("search", search);
    if (type) params.set("type", type);
    if (status) params.set("status", status);
    if (publisher) params.set("publisher", publisher);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    const res = await fetch(`/api/laws?${params}`);
    const json = await res.json();
    if (json.success) {
      if (mode === "article") {
        setArticles(json.data.articles || []);
        setTotal(json.data.total || 0);
      } else {
        setLegislations(json.data.legislations || []);
      }
    }
    setLoading(false);
  }, [mode, search, type, status, publisher, dateFrom, dateTo]);

  useEffect(() => {
    fetchLaws();
  }, [fetchLaws]);

  function clearFilters() {
    setSearch("");
    setType("");
    setStatus("");
    setPublisher("");
    setDateFrom("");
    setDateTo("");
  }

  const hasActiveFilters = !!(status || publisher || dateFrom || dateTo);

  async function openFavorites() {
    setFavOpen(true);
    setFavLoading(true);
    setFavNotLoggedIn(false);
    setSelectedCollection(null);
    try {
      const res = await fetch("/api/collections");
      if (res.status === 401) {
        setFavNotLoggedIn(true);
        setFavLoading(false);
        return;
      }
      const json = await res.json();
      if (json.success) setFavCollections(json.data);
    } catch {}
    setFavLoading(false);
  }

  async function openCollection(colId: string) {
    setCollectionLoading(true);
    setSelectedCollection(null);
    try {
      const res = await fetch(`/api/collections/${colId}`);
      const json = await res.json();
      if (json.success) setSelectedCollection(json.data);
    } catch {}
    setCollectionLoading(false);
  }

  const keywords = search.trim() ? search.trim().split(/\s+/) : [];

  return (
    <div className="max-w-5xl mx-auto px-5 py-7">
      {/* 标题 */}
      <header className="flex items-center gap-3 mb-6">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-semibold tracking-tight">法律法规检索</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--fg-secondary)" }}>
            检索现行法律法规与具体条文
          </p>
        </div>
        <button
          onClick={openFavorites}
          className="btn btn-outline h-9 px-3 text-sm shrink-0"
        >
          <IconStar size={15} />
          <span className="hidden sm:inline">我的收藏</span>
        </button>
      </header>

      {/* 模式切换 */}
      <div
        className="inline-flex p-0.5 mb-4"
        style={{ background: "var(--bg-subtle)", borderRadius: "var(--r)" }}
      >
        {(
          [
            ["legislation", "法规"],
            ["article", "条文"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setMode(key)}
            className="px-4 py-1.5 text-sm font-medium rounded-[var(--r-sm)]"
            style={
              mode === key
                ? {
                    background: "var(--card)",
                    color: "var(--fg)",
                    boxShadow: "var(--shadow-sm)",
                  }
                : { color: "var(--fg-secondary)" }
            }
          >
            {label}检索
          </button>
        ))}
      </div>

      {/* 搜索框 */}
      <div className="relative mb-3">
        <span
          className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: "var(--fg-tertiary)" }}
        >
          <IconSearch size={16} />
        </span>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && fetchLaws()}
          placeholder={
            mode === "legislation"
              ? "搜索法规名称或条文内容…"
              : "搜索具体条文内容…"
          }
          className="field !pl-10 !pr-24 h-11"
        />
        <button
          onClick={fetchLaws}
          disabled={loading}
          className="btn btn-primary absolute right-1.5 top-1/2 -translate-y-1/2 h-8 px-4 text-sm"
        >
          {loading ? <IconSpinner size={14} /> : "搜索"}
        </button>
      </div>

      {/* 类型筛选 */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {TYPE_KEYS.map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className="px-3 py-1.5 text-[0.8rem] font-medium rounded-full"
            style={
              type === t
                ? { background: "var(--accent)", color: "var(--accent-fg)" }
                : {
                    background: "var(--bg-subtle)",
                    color: "var(--fg-secondary)",
                  }
            }
          >
            {t === "" ? "全部" : typeLabels[t]}
          </button>
        ))}
      </div>

      {/* 高级筛选 */}
      <div className="card p-3 mb-6 flex flex-wrap items-center gap-x-4 gap-y-2.5">
        <Filter label="效力">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="field !py-1 !px-2 !w-auto text-xs"
          >
            <option value="">全部</option>
            <option value="effective">现行有效</option>
            <option value="amended">已修正</option>
            <option value="repealed">已废止</option>
          </select>
        </Filter>

        <Filter label="发布机构">
          <input
            value={publisher}
            onChange={(e) => setPublisher(e.target.value)}
            placeholder="如：全国人大"
            className="field !py-1 !px-2 !w-32 text-xs"
          />
        </Filter>

        <Filter label="生效日期">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="field !py-1 !px-2 !w-[8.5rem] text-xs"
          />
          <span className="text-xs" style={{ color: "var(--fg-tertiary)" }}>
            至
          </span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="field !py-1 !px-2 !w-[8.5rem] text-xs"
          />
        </Filter>

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="btn btn-ghost h-7 px-2 text-xs ml-auto"
          >
            清除筛选
          </button>
        )}
      </div>

      {/* 结果 */}
      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-[4.5rem] rounded-[var(--r-lg)]"
              style={{ background: "var(--bg-subtle)" }}
            />
          ))}
        </div>
      ) : mode === "legislation" ? (
        legislations.length === 0 ? (
          <Empty text="没有找到匹配的法规" />
        ) : (
          <div className="space-y-2">
            {legislations.map((l) => (
              <div
                key={l.id}
                onClick={() => router.push(`/laws/${l.id}`)}
                className="card-interactive px-4 py-3.5 flex items-center gap-3"
              >
                <div className="flex-1 min-w-0">
                  <p
                    className="text-[0.92rem] font-medium truncate"
                    dangerouslySetInnerHTML={{
                      __html: keywords.length
                        ? highlightKeywords(l.title, keywords)
                        : l.title,
                    }}
                  />
                  <p
                    className="text-xs mt-1"
                    style={{ color: "var(--fg-tertiary)" }}
                  >
                    {typeLabels[l.type] || l.type}
                    {l.publisher ? ` · ${l.publisher}` : ""} ·{" "}
                    {l._count.articles} 条
                  </p>
                </div>
                <span
                  className={`badge shrink-0 ${STATUS_BADGE[l.status] ?? ""}`}
                >
                  {statusLabels[l.status] || l.status}
                </span>
              </div>
            ))}
          </div>
        )
      ) : articles.length === 0 ? (
        <Empty text="没有找到匹配的条文" />
      ) : (
        <>
          {total > 0 && (
            <p className="text-xs mb-2" style={{ color: "var(--fg-tertiary)" }}>
              共 {total} 条结果
            </p>
          )}
          <div className="space-y-2">
            {articles.map((a) => (
              <div
                key={a.id}
                onClick={() =>
                  router.push(`/laws/${a.legislation.id}#article-${a.id}`)
                }
                className="card-interactive px-4 py-3.5"
              >
                <p
                  className="text-[0.8rem] font-medium mb-1.5"
                  style={{ color: "var(--accent)" }}
                  dangerouslySetInnerHTML={{
                    __html: keywords.length
                      ? highlightKeywords(
                          `《${a.legislation.title}》${a.articleNumber}`,
                          keywords,
                        )
                      : `《${a.legislation.title}》${a.articleNumber}`,
                  }}
                />
                {a.chapter && (
                  <p
                    className="text-xs mb-1.5"
                    style={{ color: "var(--fg-tertiary)" }}
                  >
                    {a.chapter}
                    {a.section ? ` / ${a.section}` : ""}
                  </p>
                )}
                <p
                  className="text-[0.86rem] leading-relaxed line-clamp-3"
                  style={{ color: "var(--fg-secondary)" }}
                  dangerouslySetInnerHTML={{
                    __html: keywords.length
                      ? highlightKeywords(a.content, keywords)
                      : a.content,
                  }}
                />
              </div>
            ))}
          </div>
        </>
      )}

      {/* 收藏夹弹层 */}
      {favOpen && (
        <div
          onClick={() => setFavOpen(false)}
          className="fixed inset-0 z-50 grid place-items-center p-5 animate-fade-in"
          style={{ background: "rgba(0,0,0,0.45)" }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg max-h-[80vh] flex flex-col animate-slide-up"
            style={{
              background: "var(--elevated)",
              border: "1px solid var(--border)",
              borderRadius: "var(--r-lg)",
              boxShadow: "var(--shadow-lg)",
            }}
          >
            <header
              className="flex items-center gap-2 px-4 h-13 py-3 shrink-0"
              style={{ borderBottom: "1px solid var(--border)" }}
            >
              {selectedCollection && (
                <button
                  onClick={() => setSelectedCollection(null)}
                  className="btn btn-ghost h-7 w-7 p-0"
                >
                  <IconChevronLeft size={15} />
                </button>
              )}
              <h3 className="flex-1 text-sm font-semibold">
                {selectedCollection ? selectedCollection.name : "我的收藏"}
              </h3>
              <button
                onClick={() => setFavOpen(false)}
                className="btn btn-ghost h-7 w-7 p-0"
              >
                <IconClose size={15} />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto p-3">
              {favNotLoggedIn ? (
                <Empty text="请先登录后查看收藏" />
              ) : favLoading || collectionLoading ? (
                <div className="grid place-items-center py-10">
                  <IconSpinner size={20} />
                </div>
              ) : selectedCollection ? (
                selectedCollection.items.length === 0 ? (
                  <Empty text="这个收藏夹还是空的" />
                ) : (
                  <div className="space-y-1.5">
                    {selectedCollection.items.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => {
                          setFavOpen(false);
                          router.push(
                            `/laws/${item.article.legislation.id}#article-${item.article.id}`,
                          );
                        }}
                        className="card-interactive px-3.5 py-3"
                      >
                        <p
                          className="text-[0.8rem] font-medium"
                          style={{ color: "var(--accent)" }}
                        >
                          《{item.article.legislation.title}》
                          {item.article.articleNumber}
                        </p>
                        <p
                          className="text-xs mt-1 line-clamp-2 leading-relaxed"
                          style={{ color: "var(--fg-secondary)" }}
                        >
                          {item.article.content}
                        </p>
                      </div>
                    ))}
                  </div>
                )
              ) : favCollections.length === 0 ? (
                <Empty text="还没有收藏夹，去法条详情页添加吧" />
              ) : (
                <div className="space-y-1.5">
                  {favCollections.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => openCollection(c.id)}
                      className="card-interactive px-3.5 py-3 flex items-center gap-3"
                    >
                      <span style={{ color: "var(--fg-tertiary)" }}>
                        <IconFolder size={17} />
                      </span>
                      <p className="flex-1 text-sm font-medium truncate">
                        {c.name}
                      </p>
                      <span className="badge shrink-0">
                        {c._count.items} 条
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- 小组件 ---------- */

function Filter({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className="text-xs font-medium shrink-0"
        style={{ color: "var(--fg-tertiary)" }}
      >
        {label}
      </span>
      {children}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="py-14 text-center">
      <p className="text-sm" style={{ color: "var(--fg-tertiary)" }}>
        {text}
      </p>
    </div>
  );
}
