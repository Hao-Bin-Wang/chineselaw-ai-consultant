"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import type { Citation } from "@/lib/rag";

interface Message {
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
}

const STORAGE_KEY = "chat-messages";

function loadMessages(): Message[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveMessages(messages: Message[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  } catch {
    // localStorage may be full or unavailable
  }
}

export function ChatBox() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 恢复对话
  useEffect(() => {
    const saved = loadMessages();
    if (saved.length > 0) {
      setMessages(saved);
    }
    setInitialized(true);
  }, []);

  // 持久化对话
  useEffect(() => {
    if (initialized) {
      saveMessages(messages);
    }
  }, [messages, initialized]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    if (!input.trim() || loading) return;
    const question = input.trim();
    setInput("");
    const userMsg: Message = { role: "user", content: question };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const json = await res.json();
      if (json.success) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: json.data.answer, citations: json.data.citations },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `错误：${json.error}` },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "网络错误，请稍后重试" },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full max-w-3xl mx-auto">
      <div className="flex-1 p-4 overflow-y-auto">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground mt-20">
            <h2 className="text-lg font-medium mb-2">⚖️ 法治智能问答</h2>
            <p className="text-sm">输入您的法律问题，获取AI即时解答与相关法条引用</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`mb-4 ${msg.role === "user" ? "text-right" : ""}`}>
            <div
              className={`inline-block max-w-[80%] p-4 rounded-lg text-left ${
                msg.role === "user"
                  ? "bg-gold/20 text-foreground border border-gold/30"
                  : "bg-[var(--card)] border border-[var(--border)]"
              }`}
            >
              <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
              {msg.citations && msg.citations.length > 0 && (
                <div className="mt-4 space-y-2">
                  {msg.citations.map((c, j) => (
                    <Link
                      key={j}
                      href={c.legislationId ? `/laws/${c.legislationId}` : "#"}
                      className={`block border-l-[3px] border-l-[var(--gold)] bg-[var(--citation-bg)] rounded-r-md px-3 py-2 transition-colors ${
                        c.legislationId ? "hover:bg-[var(--gold)]/10" : "cursor-default"
                      }`}
                      style={{ pointerEvents: c.legislationId ? "auto" : "none" }}
                    >
                      <p className="text-xs font-display text-[var(--gold)]">
                        《{c.legislationTitle}》
                      </p>
                      <p className="text-xs text-text-secondary mt-0.5">
                        {c.articleNumber}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="mb-4">
            <div className="inline-block max-w-[80%] p-4 rounded-lg bg-[var(--card)] border border-[var(--border)]">
              <p className="text-sm animate-pulse">正在思考...</p>
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </div>
      <div className="p-4 border-t border-[var(--border)] flex gap-2 bg-[var(--background)]">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="输入您的法律问题，按 Enter 发送..."
          className="flex-1 min-h-[60px] rounded-md border border-[var(--input)] bg-[var(--surface)] px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--gold)]"
          disabled={loading}
        />
        <button
          onClick={send}
          disabled={loading || !input.trim()}
          className="px-4 py-2 bg-[var(--gold)] text-[var(--primary-foreground)] rounded-md text-sm font-medium disabled:opacity-50 hover:brightness-110 transition-all"
        >
          发送
        </button>
      </div>
    </div>
  );
}
