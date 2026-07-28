"use client";

import { useState, useEffect } from "react";

interface Legislation {
  id: string;
  title: string;
  type: string;
  status: string;
  publisher: string;
  _count: { articles: number };
}

const typeLabels: Record<string, string> = {
  law: "法律",
  regulation: "行政法规",
  judicial_interpretation: "司法解释",
  rule: "部门规章",
};

export default function LawsPage() {
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [legislations, setLegislations] = useState<Legislation[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function fetchLaws() {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (type) params.set("type", type);
    const res = await fetch(`/api/laws?${params}`);
    const json = await res.json();
    if (json.success) setLegislations(json.data.legislations);
    setLoading(false);
  }

  useEffect(() => { fetchLaws(); }, [type]);

  async function viewLaw(id: string) {
    const res = await fetch(`/api/laws/${id}`);
    const json = await res.json();
    if (json.success) setSelected(json.data);
  }

  if (selected) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <button onClick={() => setSelected(null)} className="text-primary hover:underline mb-4 text-sm">
          ← 返回列表
        </button>
        <h1 className="text-xl font-bold mb-2">{selected.title}</h1>
        <p className="text-sm text-muted-foreground mb-4">
          {typeLabels[selected.type] || selected.type} · {selected.publisher || "未知发布机关"} · 共 {selected.articles.length} 条
        </p>
        <div className="h-[calc(100vh-200px)] overflow-y-auto space-y-2">
          {selected.articles.map((a: any) => (
            <div key={a.id} className="p-4 rounded-lg border bg-card">
              <p className="text-sm font-medium text-primary mb-1">{a.articleNumber}</p>
              {a.chapter && <p className="text-xs text-muted-foreground mb-1">{a.chapter}{a.section ? ` / ${a.section}` : ""}</p>}
              <p className="text-sm whitespace-pre-wrap">{a.content}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-xl font-bold mb-4">法律法规检索</h1>
      <div className="flex gap-2 mb-4">
        <input
          placeholder="搜索法规名称或条文内容..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") fetchLaws(); }}
          className="flex-1 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          onClick={fetchLaws}
          disabled={loading}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium disabled:opacity-50"
        >
          搜索
        </button>
      </div>
      <div className="flex gap-2 mb-4">
        {["", "law", "regulation", "judicial_interpretation", "rule"].map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={`px-3 py-1 rounded-md text-sm transition-colors ${
              type === t
                ? "bg-primary text-primary-foreground"
                : "border hover:bg-muted"
            }`}
          >
            {t === "" ? "全部" : typeLabels[t]}
          </button>
        ))}
      </div>
      {loading ? (
        <p className="text-sm text-muted-foreground">加载中...</p>
      ) : legislations.length === 0 ? (
        <p className="text-sm text-muted-foreground">暂无数据，请先在管理后台导入法律法规</p>
      ) : (
        legislations.map((l) => (
          <div
            key={l.id}
            className="p-4 mb-2 rounded-lg border bg-card cursor-pointer hover:bg-muted transition-colors"
            onClick={() => viewLaw(l.id)}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{l.title}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {typeLabels[l.type] || l.type} · {l.publisher || "-"} · {l._count.articles} 条
                </p>
              </div>
              <span className="text-xs text-muted-foreground shrink-0 ml-2">
                {l.status === "effective" ? "✅ 现行有效" : l.status}
              </span>
            </div>
          </div>
        ))
      )}
    </div>
  );
}