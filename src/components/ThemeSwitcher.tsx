"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme, type ThemeMode } from "./ThemeProvider";
import { IconSun, IconMoon, IconMonitor, IconChevronDown } from "./icons";

const OPTIONS: { value: ThemeMode; label: string; Icon: typeof IconSun }[] = [
  { value: "light", label: "亮色", Icon: IconSun },
  { value: "dark", label: "暗色", Icon: IconMoon },
  { value: "system", label: "跟随系统", Icon: IconMonitor },
];

export function ThemeSwitcher({ compact = false }: { compact?: boolean }) {
  const { mode, setMode } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  const current = OPTIONS.find((o) => o.value === mode) ?? OPTIONS[2];
  const CurrentIcon = current.Icon;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="切换主题"
        title={`主题：${current.label}`}
        className={
          compact
            ? "btn btn-ghost h-9 w-9 p-0"
            : "btn btn-ghost w-full h-9 px-2.5 justify-start text-sm"
        }
      >
        <CurrentIcon size={17} />
        {!compact && (
          <>
            <span className="flex-1 text-left">{current.label}</span>
            <IconChevronDown size={14} />
          </>
        )}
      </button>

      {open && (
        <div
          className="absolute z-50 min-w-[9.5rem] p-1 animate-fade-in"
          style={{
            bottom: compact ? "auto" : "calc(100% + 6px)",
            top: compact ? "calc(100% + 6px)" : "auto",
            right: compact ? 0 : "auto",
            left: compact ? "auto" : 0,
            background: "var(--elevated)",
            border: "1px solid var(--border)",
            borderRadius: "var(--r)",
            boxShadow: "var(--shadow-lg)",
          }}
        >
          {OPTIONS.map(({ value, label, Icon }) => (
            <button
              key={value}
              onClick={() => {
                setMode(value);
                setOpen(false);
              }}
              data-active={mode === value}
              className="nav-item w-full text-sm"
            >
              <Icon size={16} />
              <span className="flex-1 text-left">{label}</span>
              {mode === value && (
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: "var(--accent)" }}
                />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
