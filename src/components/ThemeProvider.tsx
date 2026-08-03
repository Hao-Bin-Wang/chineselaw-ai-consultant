"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export type ThemeMode = "light" | "dark" | "system";

const STORAGE_KEY = "theme-mode";

interface ThemeContextValue {
  /** 用户选择：light / dark / system */
  mode: ThemeMode;
  /** 实际生效：light / dark */
  resolved: "light" | "dark";
  setMode: (m: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  mode: "system",
  resolved: "light",
  setMode: () => {},
});

/** 在 <head> 内联执行，避免首屏闪烁 */
export const themeInitScript = `
(function(){
  try {
    var m = localStorage.getItem('${STORAGE_KEY}') || 'system';
    var dark = m === 'dark' || (m === 'system' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (dark) document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`;

function applyTheme(dark: boolean) {
  document.documentElement.classList.toggle("dark", dark);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("system");
  const [resolved, setResolved] = useState<"light" | "dark">("light");

  // 首次挂载：读取存储的偏好
  useEffect(() => {
    const stored = (localStorage.getItem(STORAGE_KEY) as ThemeMode) || "system";
    setModeState(stored);
  }, []);

  // mode 变化时计算并应用实际主题，同时监听系统变化
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");

    const sync = () => {
      const dark = mode === "dark" || (mode === "system" && mq.matches);
      applyTheme(dark);
      setResolved(dark ? "dark" : "light");
    };

    sync();

    if (mode === "system") {
      mq.addEventListener("change", sync);
      return () => mq.removeEventListener("change", sync);
    }
  }, [mode]);

  const setMode = useCallback((m: ThemeMode) => {
    localStorage.setItem(STORAGE_KEY, m);
    setModeState(m);
  }, []);

  return (
    <ThemeContext.Provider value={{ mode, resolved, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
