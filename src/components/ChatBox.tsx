"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import type { Citation } from "@/lib/rag";
import { IconSend, IconSpinner, IconScale } from "./icons";

interface Message {
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
}

interface ChatState {
  messages: Message[];
  pendingQuestion: string | null;
}

const STORAGE_KEY = "chat-messages";
const STATE_KEY = "chat-state";

const SUGGESTIONS = [
  "劳动合同解除需要提前多久通知？",
  "老板拖欠工资怎么办？",
  "租房押金不退如何维权？",
  "交通事故赔偿标准是什么？",
];

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
  } catch {}
}

function loadState(): ChatState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STATE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveState(state: ChatState) {
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
  } catch {}
}

function clearState() {
  try {
    localStorage.removeItem(STATE_KEY);
  } catch {}
}

export function ChatBox() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [pinnedToBottom, setPinnedToBottom] = useState(true);

  const endRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const streamRef = useRef<{ content: string; citations: Citation[] } | null>(
    null,
  );

  useEffect(() => {
    const saved = loadMessages();
    if (saved.length) setMessages(saved);

    const st = loadState();
    if (st?.pendingQuestion) {
      const q = st.pendingQuestion;
      clearState();
      const last = saved[saved.length - 1];
      if (!last || last.role === "user") {
        setLoading(true);
        sendRequest(q).finally(() => setLoading(false));
      }
    }
    setInitialized(true);
  }, []);

  useEffect(() => {
    if (initialized) saveMessages(messages);
  }, [messages, initialized]);

  useEffect(() => {
    if (!initialized) return;
    if (loading) {
      const last = messages[messages.length - 1];
      saveState({
        messages,
        pendingQuestion: last?.role === "user" ? last.content : null,
      });
    } else {
      clearState();
    }
  }, [loading, initialized]);

  // 仅在贴底时自动滚动，用户上翻后不打扰
  useEffect(() => {
    if (pinnedToBottom) {
      endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages, pinnedToBottom]);

  function onScroll() {
    const el = scrollerRef.current;
    if (!el) return;
    const gap = el.scrollHeight - el.scrollTop - el.clientHeight;
    setPinnedToBottom(gap < 80);
  }

  // 输入框自适应高度
  function autosize() {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 200) + "px";
  }

  useEffect(autosize, [input]);

  async function sendRequest(question: string) {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    streamRef.current = { content: "", citations: [] };

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, stream: true }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const detail = await res.text();
        setMessages((p) => [
          ...p,
          { role: "assistant", content: `请求失败：${detail}` },
        ]);
        return;
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() || "";

        for (const line of lines) {
          const t = line.trim();
          if (!t.startsWith("data: ")) continue;
          const data = t.slice(6);
          if (data === "[DONE]") break;
          try {
            const p = JSON.parse(data);
            if (p.type === "meta") {
              streamRef.current!.citations = p.citations || [];
              setMessages((prev) => [
                ...prev,
                { role: "assistant", content: "", citations: p.citations || [] },
              ]);
            } else if (p.type === "token") {
              streamRef.current!.content += p.content;
              setMessages((prev) => {
                const next = [...prev];
                const last = next[next.length - 1];
                if (last?.role === "assistant") {
                  next[next.length - 1] = {
                    ...last,
                    content: streamRef.current!.content,
                    citations: streamRef.current!.citations,
                  };
                }
                return next;
              });
            } else if (p.type === "error") {
              setMessages((prev) => [
                ...prev,
                { role: "assistant", content: `出错了：${p.message}` },
              ]);
            }
          } catch {}
        }
      }
    } catch (err: any) {
      if (err?.name === "AbortError") return;
      setMessages((p) => [
        ...p,
        { role: "assistant", content: "网络连接失败，请稍后重试。" },
      ]);
    }
  }

  async function send(text?: string) {
    const question = (text ?? input).trim();
    if (!question || loading) return;
    setInput("");
    setMessages((p) => [...p, { role: "user", content: question }]);
    setPinnedToBottom(true);
    setLoading(true);
    try {
      await sendRequest(question);
    } finally {
      setLoading(false);
      streamRef.current = null;
    }
  }

  const empty = messages.length === 0 && !loading;

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] md:h-screen">
      {/* 消息区 */}
      <div
        ref={scrollerRef}
        onScroll={onScroll}
        className="flex-1 overflow-y-auto"
      >
        {empty ? (
          <div className="h-full grid place-items-center px-6">
            <div className="w-full max-w-content animate-slide-up">
              <div className="text-center mb-9">
                <span
                  className="inline-grid place-items-center w-14 h-14 rounded-2xl mb-5"
                  style={{
                    background: "var(--accent-subtle)",
                    color: "var(--accent)",
                  }}
                >
                  <IconScale size={28} />
                </span>
                <h1 className="text-[1.7rem] font-semibold tracking-tight mb-2">
                  有什么法律问题？
                </h1>
                <p
                  className="text-sm"
                  style={{ color: "var(--fg-secondary)" }}
                >
                  基于现行法律法规为您解答，并附上准确的法条依据
                </p>
              </div>

              <Composer
                taRef={taRef}
                input={input}
                setInput={setInput}
                onSend={() => send()}
                loading={loading}
              />

              <div className="flex flex-wrap gap-2 justify-center mt-5">
                {SUGGESTIONS.map((s) => (
                  <button key={s} onClick={() => send(s)} className="chip">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-content mx-auto px-5 py-7 space-y-7">
            {messages.map((m, i) => {
              const streaming =
                loading && i === messages.length - 1 && m.role === "assistant";
              return (
                <div key={i} className="animate-fade-in">
                  {m.role === "user" ? (
                    <div className="flex justify-end">
                      <div
                        className="max-w-[85%] px-4 py-2.5 text-[0.9rem] leading-relaxed"
                        style={{
                          background: "var(--accent)",
                          color: "var(--accent-fg)",
                          borderRadius: "var(--r-lg) var(--r-lg) 4px var(--r-lg)",
                        }}
                      >
                        <p className="whitespace-pre-wrap">{m.content}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-3">
                      <span
                        className="grid place-items-center w-7 h-7 rounded-full shrink-0 mt-0.5"
                        style={{
                          background: "var(--accent-subtle)",
                          color: "var(--accent)",
                        }}
                      >
                        <IconScale size={15} />
                      </span>
                      <div className="min-w-0 flex-1">
                        {!m.content && streaming ? (
                          <span className="dot-typing inline-flex items-center h-7">
                            <span />
                            <span />
                            <span />
                          </span>
                        ) : (
                          <div
                            className={`text-[0.9rem] leading-[1.75] whitespace-pre-wrap ${
                              streaming ? "caret" : ""
                            }`}
                          >
                            {m.content}
                          </div>
                        )}

                        {!!m.citations?.length && (
                          <div className="mt-4">
                            <p
                              className="text-xs mb-2 font-medium"
                              style={{ color: "var(--fg-tertiary)" }}
                            >
                              法条依据
                            </p>
                            <div className="space-y-1.5">
                              {m.citations.map((c, j) => (
                                <Link
                                  key={j}
                                  href={
                                    c.legislationId
                                      ? `/laws/${c.legislationId}#article-${c.articleId}`
                                      : "#"
                                  }
                                  className="card-interactive block px-3.5 py-2.5"
                                  style={{
                                    pointerEvents: c.legislationId
                                      ? "auto"
                                      : "none",
                                  }}
                                >
                                  <p
                                    className="text-[0.8rem] font-medium"
                                    style={{ color: "var(--accent)" }}
                                  >
                                    《{c.legislationTitle}》{c.articleNumber}
                                  </p>
                                  {c.content && (
                                    <p
                                      className="text-xs mt-1 line-clamp-2 leading-relaxed"
                                      style={{ color: "var(--fg-secondary)" }}
                                    >
                                      {c.content}
                                    </p>
                                  )}
                                </Link>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            <div ref={endRef} className="h-1" />
          </div>
        )}
      </div>

      {/* 底部输入区（有消息时） */}
      {!empty && (
        <div
          className="px-5 pb-5 pt-2"
          style={{
            background:
              "linear-gradient(to top, var(--bg) 60%, transparent)",
          }}
        >
          <div className="max-w-content mx-auto">
            <Composer
              taRef={taRef}
              input={input}
              setInput={setInput}
              onSend={() => send()}
              loading={loading}
            />
            <p
              className="text-center text-[0.7rem] mt-2.5"
              style={{ color: "var(--fg-tertiary)" }}
            >
              内容由 AI 生成，仅供参考，不构成正式法律意见
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- 输入框 ---------- */

function Composer({
  taRef,
  input,
  setInput,
  onSend,
  loading,
}: {
  taRef: React.RefObject<HTMLTextAreaElement>;
  input: string;
  setInput: (v: string) => void;
  onSend: () => void;
  loading: boolean;
}) {
  return (
    <div
      className="relative"
      style={{
        background: "var(--card)",
        border: "1px solid var(--border-strong)",
        borderRadius: "var(--r-xl)",
        boxShadow: "var(--shadow)",
      }}
    >
      <textarea
        ref={taRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            onSend();
          }
        }}
        rows={1}
        placeholder="输入您的法律问题…"
        disabled={loading}
        className="w-full bg-transparent resize-none px-4 pt-3.5 pb-12 text-[0.9rem]
                   leading-relaxed focus:outline-none scrollbar-none"
        style={{ color: "var(--fg)", minHeight: "3.4rem" }}
      />

      <div className="absolute right-2.5 bottom-2.5 flex items-center gap-2">
        <span
          className="hidden sm:block text-[0.7rem]"
          style={{ color: "var(--fg-tertiary)" }}
        >
          Enter 发送 / Shift+Enter 换行
        </span>
        <button
          onClick={onSend}
          disabled={loading || !input.trim()}
          aria-label="发送"
          className="btn btn-primary w-8 h-8 p-0 !rounded-full"
        >
          {loading ? <IconSpinner size={15} /> : <IconSend size={16} />}
        </button>
      </div>
    </div>
  );
}
