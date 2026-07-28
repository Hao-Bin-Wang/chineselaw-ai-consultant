"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { typeLabels, statusLabels, statusColors } from "@/lib/constants";

interface Legislation {
  id: string;
  title: string;
  type: string;
  status: string;
  publisher: string;
  _count: { articles: number };
}

export default function LawsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [publisher, setPublisher] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [legislations, setLegislations] = useState<Legislation[]>([]);
  const [loading, setLoading] = useState(false);

  async function fetchLaws() {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (type) params.set("type", type);
    if (status) params.set("status", status);
    if (publisher) params.set("publisher", publisher);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    const res = await fetch(`/api/laws?${params}`);
    const json = await res.json();
    if (json.success) setLegislations(json.data.legislations);
    setLoading(false);
  }

  useEffect(() => { fetchLaws(); }, [type, status]);

  function clearFilters() {
    setSearch("");
    setType("");
    setStatus("");
    setPublisher("");
    setDateFrom("");
    setDateTo("");
  }

  function hasActiveFilters(): boolean {
    return !!(status || publisher || dateFrom || dateTo);
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <h1 className="text-xl font-display text-foreground mb-4">法律法规检索</h1>

      {/* 搜索栏 */}
      <div className="flex gap-2 mb-4">
        <input
          placeholder="搜索法规名称或条文内容..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") fetchLaws(); }}
          className="flex-1 h-10 rounded-md border border-[var(--input)] bg-[var(--surface)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--gold)]"
        />
        <button
          onClick={fetchLaws}
          disabled={loading}
          className="px-4 py-2 bg-[var(--gold)] text-[var(--primary-foreground)] rounded-md text-sm font-medium disabled:opacity-50 hover:brightness-110 transition-all"
        >
          搜索
        </button>
      </div>

      {/* 类型筛选 */}
      <div className="flex gap-2 mb-3 flex-wrap">
        {["", "law", "regulation", "judicial_interpretation", "rule"].map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={`px-3 py-1 rounded-md text-sm transition-colors ${
              type === t
                ? "bg-[var(--gold)] text-[var(--primary-foreground)]"
                : "border border-[var(--border)] text-text-secondary hover:text-foreground hover:border-[var(--gold)]"
            }`}
          >
            {t === "" ? "全部" : typeLabels[t]}
          </button>
        ))}
      </div>

      {/* 高级筛选面板 */}
      <div className="flex flex-wrap items-center gap-3 mb-4 p-3 rounded-md bg-[var(--surface)] border border-[var(--border)]">
        {/* 效力状态 */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-text-secondary shrink-0">效力：</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="h-8 rounded border border-[var(--input)] bg-[var(--background)] px-2 text-xs focus:outline-none focus:ring-2 focus:ring-[var(--gold)]"
          >
            <option value="">全部</option>
            <option value="effective">现行有效</option>
            <option value="amended">已修正</option>
            <option value="repealed">已废止</option>
          </select>
        </div>

        {/* 发布机构 */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-text-secondary shrink-0">机构：</span>
          <input
            value={publisher}
            onChange={(e) => setPublisher(e.target.value)}
            placeholder="输入发布机构"
            className="h-8 w-36 rounded border border-[var(--input)] bg-[var(--background)] px-2 text-xs focus:outline-none focus:ring-2 focus:ring-[var(--gold)]"
          />
        </div>

        {/* 日期范围 */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-text-secondary shrink-0">日期：</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="h-8 w-32 rounded border border-[var(--input)] bg-[var(--background)] px-2 text-xs focus:outline-none focus:ring-2 focus:ring-[var(--gold)]"
          />
          <span className="text-xs text-text-secondary">至</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="h-8 w-32 rounded border border-[var(--input)] bg-[var(--background)] px-2 text-xs focus:outline-none focus:ring-2 focus:ring-[var(--gold)]"
          />
        </div>

        {/* 清除筛选 */}
        {hasActiveFilters() && (
          <button
            onClick={clearFilters}
            className="h-8 px-2 text-xs text-text-secondary hover:text-foreground transition-colors"
          >
            清除筛选
          </button>
        )}
      </div>

      {/* 结果列表 */}
      {loading ? (
        <p className="text-sm text-text-secondary">加载中...</p>
      ) : legislations.length === 0 ? (
        <p className="text-sm text-text-secondary">暂无数据，请先在管理后台导入法律法规</p>
      ) : (
        legislations.map((l) => (
          <div
            key={l.id}
            className="p-4 mb-2 rounded-lg bg-[var(--card)] border border-[var(--border)] cursor-pointer hover:border-[var(--gold)] transition-colors"
            onClick={() => router.push(`/laws/${l.id}`)}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-display text-foreground">{l.title}</p>
                <p className="text-xs text-text-secondary mt-1">
                  {typeLabels[l.type] || l.type} · {l.publisher || "-"} · {l._count.articles} 条
                </p>
              </div>
              <span className={`text-xs shrink-0 ml-2 ${statusColors[l.status] || "text-text-secondary"}`}>
                {statusLabels[l.status] || l.status}
              </span>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
