"use client";

import { useEffect } from "react";

/**
 * Scrolls to the article specified in the URL hash (#article-{id})
 * when the page loads or the hash changes.
 */
export function ScrollToArticle() {
  useEffect(() => {
    const scroll = () => {
      const hash = window.location.hash;
      if (hash.startsWith("#article-")) {
        const el = document.getElementById(hash.slice(1));
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          // 高亮效果：短暂着色后淡出
          el.style.transition = "background-color 0.4s ease";
          el.style.backgroundColor = "var(--accent-subtle)";
          setTimeout(() => {
            el.style.backgroundColor = "";
          }, 2000);
        }
      }
    };

    // 页面加载后滚动
    if (document.readyState === "complete") {
      scroll();
    } else {
      window.addEventListener("load", scroll);
      return () => window.removeEventListener("load", scroll);
    }
  }, []);

  return null;
}
