"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

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

  useEffect(() => { fetchCaptcha(); }, []);

  async function submit() {
    setError("");
    setLoading(true);
    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, captchaToken, captchaCode }),
      });
      const json = await res.json();
      if (json.success) {
        router.push("/chat");
      } else {
        setError(json.error);
        fetchCaptcha();
      }
    } catch {
      setError("网络错误");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md p-8 bg-white rounded-xl shadow-sm border">
        <h1 className="text-2xl font-bold text-center mb-6">⚖️ 法治智能问答</h1>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">账号</label>
            <input
              placeholder="请输入账号"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">密码</label>
            <input
              type="password"
              placeholder="请输入密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
              className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">验证码</label>
            <div className="flex gap-2">
              <input
                placeholder="输入验证码"
                value={captchaCode}
                onChange={(e) => setCaptchaCode(e.target.value)}
                className="flex-1 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <div
                dangerouslySetInnerHTML={{ __html: captchaSvg }}
                onClick={fetchCaptcha}
                className="cursor-pointer border rounded-md p-1 hover:bg-muted shrink-0"
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            onClick={submit}
            disabled={loading}
            className="w-full h-10 bg-primary text-primary-foreground rounded-md text-sm font-medium disabled:opacity-50 hover:bg-primary/90 transition-colors"
          >
            {loading ? "处理中..." : mode === "login" ? "登录" : "注册"}
          </button>

          <p className="text-sm text-center text-muted-foreground">
            {mode === "login" ? "没有账号？" : "已有账号？"}
            <button
              onClick={() => {
                setMode(mode === "login" ? "register" : "login");
                setError("");
                fetchCaptcha();
              }}
              className="text-primary hover:underline ml-1"
            >
              {mode === "login" ? "注册" : "登录"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}