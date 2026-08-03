"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { IconScale, IconSpinner } from "@/components/icons";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [captchaSvg, setCaptchaSvg] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaCode, setCaptchaCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function fetchCaptcha() {
    const res = await fetch("/api/auth/captcha");
    const json = await res.json();
    setCaptchaSvg(json.data.svg);
    setCaptchaToken(json.data.token);
    setCaptchaCode("");
  }

  useEffect(() => {
    fetchCaptcha();
  }, []);

  async function submit() {
    if (loading) return;
    setError("");
    setLoading(true);
    try {
      const endpoint =
        mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, captchaToken, captchaCode }),
      });
      const json = await res.json();
      if (json.success) {
        router.push("/chat");
      } else {
        setError(json.error || "操作失败");
        fetchCaptcha();
      }
    } catch {
      setError("网络连接失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center px-5 relative">
      <div className="absolute top-4 right-4">
        <ThemeSwitcher compact />
      </div>

      <div className="w-full max-w-[22rem] animate-slide-up">
        <div className="text-center mb-8">
          <span
            className="inline-grid place-items-center w-12 h-12 rounded-2xl mb-4"
            style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
          >
            <IconScale size={24} />
          </span>
          <h1 className="text-xl font-semibold tracking-tight">
            法治智能问答系统
          </h1>
          <p className="text-sm mt-1.5" style={{ color: "var(--fg-secondary)" }}>
            {mode === "login" ? "登录以继续使用" : "创建一个新账号"}
          </p>
        </div>

        <div className="card p-6 space-y-4">
          <div>
            <label
              className="block text-xs font-medium mb-1.5"
              style={{ color: "var(--fg-secondary)" }}
            >
              账号
            </label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="请输入账号"
              autoComplete="username"
              className="field"
            />
          </div>

          <div>
            <label
              className="block text-xs font-medium mb-1.5"
              style={{ color: "var(--fg-secondary)" }}
            >
              密码
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="请输入密码"
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              className="field"
            />
          </div>

          <div>
            <label
              className="block text-xs font-medium mb-1.5"
              style={{ color: "var(--fg-secondary)" }}
            >
              验证码
            </label>
            <div className="flex gap-2">
              <input
                value={captchaCode}
                onChange={(e) => setCaptchaCode(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                placeholder="输入右侧验证码"
                className="field flex-1"
              />
              <button
                onClick={fetchCaptcha}
                title="点击刷新"
                dangerouslySetInnerHTML={{ __html: captchaSvg }}
                className="shrink-0 grid place-items-center px-1 overflow-hidden"
                style={{
                  border: "1px solid var(--input-border)",
                  borderRadius: "var(--r)",
                  background: "var(--bg)",
                  width: "6.5rem",
                }}
              />
            </div>
          </div>

          {error && (
            <div
              className="px-3 py-2 text-xs"
              style={{
                background: "var(--danger-subtle)",
                color: "var(--danger)",
                borderRadius: "var(--r-sm)",
              }}
            >
              {error}
            </div>
          )}

          <button
            onClick={submit}
            disabled={loading}
            className="btn btn-primary w-full h-10 text-sm"
          >
            {loading ? (
              <>
                <IconSpinner size={15} />
                处理中…
              </>
            ) : mode === "login" ? (
              "登录"
            ) : (
              "注册"
            )}
          </button>
        </div>

        <p
          className="text-center text-xs mt-5"
          style={{ color: "var(--fg-secondary)" }}
        >
          {mode === "login" ? "还没有账号？" : "已有账号？"}
          <button
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              setError("");
              fetchCaptcha();
            }}
            className="ml-1 font-medium"
            style={{ color: "var(--accent)" }}
          >
            {mode === "login" ? "立即注册" : "返回登录"}
          </button>
        </p>
      </div>
    </div>
  );
}
