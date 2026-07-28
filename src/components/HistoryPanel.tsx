"use client";

import { useState, useEffect } from "react";
import type { Citation } from "@/lib/rag";

interface Conversation {
  id: string;
  question: string;
  answer: string;
  citations: Citation[];
  createdAt: string;
}

export function HistoryPanel() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);

  useEffect(() => {
    fetch("/api/chat/history")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setConversations(json.data);
      });
  }, []);

  if (selected) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-3 border-b flex items-center gap-2">
          <button
            onClick={() => setSelected(null)}
            className="text-sm text-primary hover:underline"
          >
            ← 返回
          </button>
        </div>
        <div className="flex-1 p-4 overflow-y-auto">
          <p className="text-sm font-medium mb-2">问题：</p>
          <p className="text-sm mb-4">{selected.question}</p>
          <p className="text-sm font-medium mb-2">回答：</p>
          <p className="text-sm whitespace-pre-wrap">{selected.answer}</p>
          {selected.citations && selected.citations.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium mb-2">参考法条：</p>
              {selected.citations.map((c, i) => (
                <div key={i} className="p-2 mb-2 rounded-lg border bg-card">
                  <p className="text-xs font-medium">
                    《{c.legislationTitle}》{c.articleNumber}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {c.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b">
        <h3 className="font-medium text-sm">历史对话</h3>
      </div>
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <p className="text-sm text-muted-foreground p-4">暂无对话记录</p>
        ) : (
          conversations.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelected(c)}
              className="w-full text-left p-3 hover:bg-muted border-b transition-colors"
            >
              <p className="text-sm truncate">{c.question}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {new Date(c.createdAt).toLocaleDateString("zh-CN")}
              </p>
            </button>
          ))
        )}
      </div>
    </div>
  );
}