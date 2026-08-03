"use client";

import { useState, useEffect } from "react";
import type { Citation } from "@/lib/rag";
import { IconTrash, IconChevronLeft } from "./icons";

interface Conversation {
  id: string;
  question: string;
  answer: string;
  citations: Citation[];
  createdAt: string;
}

/** 按今天 / 7天内 / 更早分组 */
function groupByDate(list: Conversation[]) {
  const now = Date.now();
  const day = 86400000;
  const groups: { label: string; items: Conversation[] }[] = [
    { label: "今天", items: [] },
    { label: "近 7 天", items: [] },
    { label: "更早", items: [] },
  ];
  for (const c of list) {
    const age = now - new Date(c.createdAt).getTime();
    if (age < day) groups[0].items.push(c);
    else if (age < day * 7) groups[1].items.push(c);
    else groups[2].items.push(c);
  }
  return groups.filter((g) => g.items.length > 0);
}

export function HistoryPanel() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    fetch("/api/chat/history")
      .then((r) => r.json())
      .then((j) => j.success && setConversations(j.data))
      .catch(() => {});
  }, []);

  async function removeOne(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    const res = await fetch(`/api/chat/history/${id}`, { method: "DELETE" });
    if (res.ok) {
      setConversations((p) => p.filter((c) => c.id !== id));
      if (selected?.id === id) setSelected(null);
    }
  }

  async function clearAll() {
    const res = await fetch("/api/chat/history", { method: "DELETE" });
    if (res.ok) {
      setConversations([]);
      setSelected(null);
    }
    setConfirmClear(false);
  }

  /* ----- 详情视图 ----- */
  if (selected) {
    return (
      <div className="h-full flex flex-col">
        <header
          className="flex items-center gap-1.5 px-3 h-12 shrink-0"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <button
            onClick={() => setSelected(null)}
            className="btn btn-ghost h-7 px-2 text-xs"
          >
            <IconChevronLeft size={14} />
            返回
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-3.5 space-y-4">
          <section>
            <p
              className="text-[0.7rem] font-medium mb-1.5"
              style={{ color: "var(--fg-tertiary)" }}
            >
              问题
            </p>
            <p className="text-[0.82rem] leading-relaxed">
              {selected.question}
            </p>
          </section>

          <div style={{ borderTop: "1px solid var(--border)" }} />

          <section>
            <p
              className="text-[0.7rem] font-medium mb-1.5"
              style={{ color: "var(--fg-tertiary)" }}
            >
              回答
            </p>
            <p className="text-[0.82rem] leading-relaxed whitespace-pre-wrap">
              {selected.answer}
            </p>
          </section>

          {!!selected.citations?.length && (
            <section>
              <p
                className="text-[0.7rem] font-medium mb-2"
                style={{ color: "var(--fg-tertiary)" }}
              >
                法条依据
              </p>
              <div className="space-y-1.5">
                {selected.citations.map((c, i) => (
                  <div key={i} className="card px-3 py-2">
                    <p
                      className="text-[0.75rem] font-medium"
                      style={{ color: "var(--accent)" }}
                    >
                      《{c.legislationTitle}》{c.articleNumber}
                    </p>
                    <p
                      className="text-[0.72rem] mt-1 line-clamp-3 leading-relaxed"
                      style={{ color: "var(--fg-secondary)" }}
                    >
                      {c.content}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    );
  }

  /* ----- 列表视图 ----- */
  const groups = groupByDate(conversations);

  return (
    <div className="h-full flex flex-col">
      <header
        className="flex items-center justify-between px-3.5 h-12 shrink-0"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <h2 className="text-[0.82rem] font-semibold">历史对话</h2>
        {conversations.length > 0 &&
          (confirmClear ? (
            <span className="flex items-center gap-1">
              <button
                onClick={clearAll}
                className="btn h-6 px-2 text-[0.7rem]"
                style={{ background: "var(--danger)", color: "#fff" }}
              >
                确认
              </button>
              <button
                onClick={() => setConfirmClear(false)}
                className="btn btn-ghost h-6 px-2 text-[0.7rem]"
              >
                取消
              </button>
            </span>
          ) : (
            <button
              onClick={() => setConfirmClear(true)}
              className="btn btn-ghost h-6 px-2 text-[0.7rem]"
            >
              清空
            </button>
          ))}
      </header>

      <div className="flex-1 overflow-y-auto px-2 py-2">
        {conversations.length === 0 ? (
          <p
            className="text-xs text-center py-8"
            style={{ color: "var(--fg-tertiary)" }}
          >
            暂无对话记录
          </p>
        ) : (
          groups.map((g) => (
            <div key={g.label} className="mb-3">
              <p
                className="text-[0.68rem] font-medium px-2 mb-1"
                style={{ color: "var(--fg-tertiary)" }}
              >
                {g.label}
              </p>
              <div className="space-y-0.5">
                {g.items.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => setSelected(c)}
                    className="group flex items-start gap-1.5 px-2 py-2 rounded-[var(--r-sm)]
                               cursor-pointer hover:bg-[var(--sidebar-hover)]"
                  >
                    <p className="flex-1 min-w-0 text-[0.78rem] leading-snug line-clamp-2">
                      {c.question}
                    </p>
                    <button
                      onClick={(e) => removeOne(c.id, e)}
                      title="删除"
                      className="btn btn-danger-ghost h-5 w-5 p-0 shrink-0
                                 opacity-0 group-hover:opacity-100 focus:opacity-100"
                    >
                      <IconTrash size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
