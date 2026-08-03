"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ThemeSwitcher } from "./ThemeSwitcher";
import {
  IconChat,
  IconBook,
  IconSettings,
  IconLogout,
  IconScale,
} from "./icons";

interface NavLink {
  href: string;
  label: string;
  Icon: typeof IconChat;
  adminOnly?: boolean;
}

const LINKS: NavLink[] = [
  { href: "/chat", label: "智能问答", Icon: IconChat },
  { href: "/laws", label: "法条检索", Icon: IconBook },
  { href: "/admin", label: "知识库管理", Icon: IconSettings, adminOnly: true },
];

export function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [role, setRole] = useState("");
  const [username, setUsername] = useState("");

  useEffect(() => {
    const cookie = document.cookie
      .split("; ")
      .find((r) => r.startsWith("auth-token="));
    if (!cookie) return;
    try {
      const payload = JSON.parse(atob(cookie.split(".")[1]));
      setRole(payload.role ?? "");
      setUsername(payload.username ?? "");
    } catch {}
  }, [pathname]);

  if (pathname === "/login") return null;

  function logout() {
    document.cookie = "auth-token=; path=/; max-age=0";
    router.push("/login");
  }

  const visible = LINKS.filter((l) => !l.adminOnly || role === "admin");

  return (
    <aside
      className="hidden md:flex w-[15rem] shrink-0 flex-col h-screen sticky top-0"
      style={{
        background: "var(--sidebar)",
        borderRight: "1px solid var(--border)",
      }}
    >
      {/* Logo */}
      <div className="px-3 pt-4 pb-3">
        <button
          onClick={() => router.push("/chat")}
          className="flex items-center gap-2.5 px-2 py-1.5 w-full rounded-[var(--r)] hover:bg-[var(--sidebar-hover)]"
        >
          <span
            className="grid place-items-center w-8 h-8 rounded-[var(--r-sm)] shrink-0"
            style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
          >
            <IconScale size={18} />
          </span>
          <span className="text-[0.9rem] font-semibold tracking-tight">
            法治智能问答
          </span>
        </button>
      </div>

      {/* 导航 */}
      <nav className="px-3 space-y-0.5">
        {visible.map(({ href, label, Icon }) => (
          <button
            key={href}
            onClick={() => router.push(href)}
            data-active={pathname === href || pathname.startsWith(href + "/")}
            className="nav-item w-full"
          >
            <Icon size={17} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <div className="flex-1" />

      {/* 底部：主题 + 用户 */}
      <div
        className="px-3 py-3 space-y-1"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        <ThemeSwitcher />

        <div className="flex items-center gap-2 px-2.5 py-2">
          <span
            className="grid place-items-center w-7 h-7 rounded-full text-xs font-semibold shrink-0"
            style={{
              background: "var(--accent-subtle)",
              color: "var(--accent)",
            }}
          >
            {(username || "U")[0].toUpperCase()}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm truncate leading-tight">
              {username || "用户"}
            </p>
            {role === "admin" && (
              <p
                className="text-[0.7rem] leading-tight"
                style={{ color: "var(--accent)" }}
              >
                管理员
              </p>
            )}
          </div>
          <button
            onClick={logout}
            title="退出登录"
            className="btn btn-ghost h-7 w-7 p-0 shrink-0"
          >
            <IconLogout size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}

/** 移动端顶栏 */
export function MobileBar() {
  const router = useRouter();
  const pathname = usePathname();
  const [role, setRole] = useState("");

  useEffect(() => {
    const cookie = document.cookie
      .split("; ")
      .find((r) => r.startsWith("auth-token="));
    if (!cookie) return;
    try {
      setRole(JSON.parse(atob(cookie.split(".")[1])).role ?? "");
    } catch {}
  }, [pathname]);

  if (pathname === "/login") return null;

  const visible = LINKS.filter((l) => !l.adminOnly || role === "admin");

  return (
    <div
      className="md:hidden sticky top-0 z-40 flex items-center gap-1 px-3 h-14"
      style={{
        background: "var(--sidebar)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <span
        className="grid place-items-center w-8 h-8 rounded-[var(--r-sm)] shrink-0 mr-1"
        style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
      >
        <IconScale size={17} />
      </span>
      {visible.map(({ href, label, Icon }) => (
        <button
          key={href}
          onClick={() => router.push(href)}
          data-active={pathname === href || pathname.startsWith(href + "/")}
          className="nav-item !px-2.5"
          title={label}
        >
          <Icon size={17} />
        </button>
      ))}
      <div className="flex-1" />
      <ThemeSwitcher compact />
    </div>
  );
}
