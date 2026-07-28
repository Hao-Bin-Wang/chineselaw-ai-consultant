"use client";

import { useState, useRef, useEffect } from "react";
import type { Citation } from "@/lib/rag";

interface Message {
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
}

export function ChatBox() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    if (!input.trim() || loading) return;
    const question = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: question }]);
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
              className={`inline-block max-w-[80%] p-4 rounded-lg ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              }`}
            >
              <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
              {msg.citations && msg.citations.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border/50">
                  <p className="text-xs font-medium mb-1 opacity-70">参考法条：</p>
                  {msg.citations.map((c, j) => (
                    <p key={j} className="text-xs opacity-70 mb-1">
                      · 《{c.legislationTitle}》{c.articleNumber}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="mb-4">
            <div className="inline-block max-w-[80%] p-4 rounded-lg bg-muted">
              <p className="text-sm animate-pulse">正在思考...</p>
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </div>
      <div className="p-4 border-t flex gap-2">
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
          className="flex-1 min-h-[60px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
          disabled={loading}
        />
        <button
          onClick={send}
          disabled={loading || !input.trim()}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium disabled:opacity-50 hover:bg-primary/90 transition-colors"
        >
          发送
        </button>
      </div>
    </div>
  );
}