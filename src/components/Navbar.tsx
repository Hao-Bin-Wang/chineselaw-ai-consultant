"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect } from "react";

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [role, setRole] = useState<string>("");

  useEffect(() => {
    const token = document.cookie
      .split("; ")
      .find((row) => row.startsWith("auth-token="));
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        setRole(payload.role);
      } catch {}
    }
  }, [pathname]);

  if (pathname === "/login") return null;

  const links = [
    { href: "/chat", label: "智能问答" },
    { href: "/laws", label: "法条检索" },
  ];
  if (role === "admin") {
    links.push({ href: "/admin", label: "知识库管理" });
  }

  async function logout() {
    document.cookie = "auth-token=; path=/; max-age=0";
    router.push("/login");
  }

  return (
    <nav className="border-b h-16 flex items-center px-6 gap-2 bg-background">
      <h1 className="font-bold text-lg mr-4 shrink-0">⚖️ 法治智能问答</h1>
      {links.map((link) => (
        <button
          key={link.href}
          onClick={() => router.push(link.href)}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            pathname === link.href
              ? "bg-primary text-primary-foreground"
              : "hover:bg-muted"
          }`}
        >
          {link.label}
        </button>
      ))}
      <div className="flex-1" />
      <button
        onClick={logout}
        className="px-3 py-1.5 rounded-md text-sm border hover:bg-muted transition-colors"
      >
        退出
      </button>
    </nav>
  );
}