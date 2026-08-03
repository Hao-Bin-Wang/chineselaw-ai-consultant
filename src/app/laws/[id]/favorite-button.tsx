"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  IconStar,
  IconStarFilled,
  IconPlus,
  IconSpinner,
} from "@/components/icons";

interface Collection {
  id: string;
  name: string;
  _count: { items: number };
}

interface CollectionItem {
  id: string;
  articleId: string;
}

interface CollectionWithItems extends Collection {
  items: CollectionItem[];
}

export function FavoriteButton({ articleId }: { articleId: string }) {
  const [open, setOpen] = useState(false);
  const [collections, setCollections] = useState<CollectionWithItems[]>([]);
  const [loading, setLoading] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [favoritedIn, setFavoritedIn] = useState<Set<string>>(new Set());
  const [favoritedItemIds, setFavoritedItemIds] = useState<Map<string, string>>(
    new Map(),
  );
  const [notLoggedIn, setNotLoggedIn] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const fetchCollections = useCallback(async () => {
    setLoading(true);
    setNotLoggedIn(false);
    try {
      const res = await fetch("/api/collections");
      if (res.status === 401) {
        setNotLoggedIn(true);
        setLoading(false);
        return;
      }
      const json = await res.json();
      if (!json.success) {
        setLoading(false);
        return;
      }
      const cols: Collection[] = json.data;

      const withItems: CollectionWithItems[] = await Promise.all(
        cols.map(async (c) => {
          const r = await fetch(`/api/collections/${c.id}`);
          const j = await r.json();
          return j.success ? j.data : { ...c, items: [] };
        }),
      );
      setCollections(withItems);

      const favIn = new Set<string>();
      const itemIds = new Map<string, string>();
      for (const c of withItems) {
        const item = c.items.find((i) => i.articleId === articleId);
        if (item) {
          favIn.add(c.id);
          itemIds.set(c.id, item.id);
        }
      }
      setFavoritedIn(favIn);
      setFavoritedItemIds(itemIds);
    } catch {
      // ignore
    }
    setLoading(false);
  }, [articleId]);

  useEffect(() => {
    if (open) fetchCollections();
  }, [open, fetchCollections]);

  async function addToCollection(collectionId: string) {
    try {
      const res = await fetch(`/api/collections/${collectionId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articleId }),
      });
      const json = await res.json();
      if (json.success) {
        fetchCollections();
      } else {
        alert(json.error || "收藏失败");
      }
    } catch {
      alert("网络错误");
    }
  }

  async function removeFromCollection(collectionId: string, itemId: string) {
    try {
      const res = await fetch(
        `/api/collections/${collectionId}/items?itemId=${itemId}`,
        { method: "DELETE" },
      );
      const json = await res.json();
      if (json.success) {
        fetchCollections();
      } else {
        alert(json.error || "取消收藏失败");
      }
    } catch {
      alert("网络错误");
    }
  }

  async function createCollection() {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      const json = await res.json();
      if (json.success) {
        setNewName("");
        fetchCollections();
      } else {
        alert(json.error || "创建失败");
      }
    } catch {
      alert("网络错误");
    }
    setCreating(false);
  }

  const isFavorited = favoritedIn.size > 0;

  return (
    <div ref={dropdownRef} className="relative inline-block">
      <button
        onClick={() => setOpen(!open)}
        title={isFavorited ? "已收藏" : "收藏"}
        className="btn btn-ghost h-7 w-7 p-0"
        style={isFavorited ? { color: "var(--accent)" } : undefined}
      >
        {isFavorited ? <IconStarFilled size={15} /> : <IconStar size={15} />}
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1.5 z-50 w-60 animate-fade-in overflow-hidden"
          style={{
            background: "var(--elevated)",
            border: "1px solid var(--border)",
            borderRadius: "var(--r)",
            boxShadow: "var(--shadow-lg)",
          }}
        >
          <div
            className="px-3 py-2"
            style={{ borderBottom: "1px solid var(--border)" }}
          >
            <p
              className="text-[0.7rem] font-medium"
              style={{ color: "var(--fg-tertiary)" }}
            >
              收藏到
            </p>
          </div>

          <div className="max-h-52 overflow-y-auto p-1">
            {notLoggedIn ? (
              <p
                className="text-xs text-center py-5"
                style={{ color: "var(--fg-tertiary)" }}
              >
                请先登录
              </p>
            ) : loading ? (
              <div className="grid place-items-center py-5">
                <IconSpinner size={16} />
              </div>
            ) : collections.length === 0 ? (
              <p
                className="text-xs text-center py-5"
                style={{ color: "var(--fg-tertiary)" }}
              >
                还没有收藏夹
              </p>
            ) : (
              collections.map((c) => {
                const has = favoritedIn.has(c.id);
                return (
                  <button
                    key={c.id}
                    onClick={() => {
                      if (has) {
                        const itemId = favoritedItemIds.get(c.id);
                        if (itemId) removeFromCollection(c.id, itemId);
                      } else {
                        addToCollection(c.id);
                      }
                    }}
                    className="nav-item w-full text-[0.82rem]"
                  >
                    <span className="flex-1 text-left truncate">{c.name}</span>
                    {has ? (
                      <span style={{ color: "var(--accent)" }}>
                        <IconStarFilled size={13} />
                      </span>
                    ) : (
                      <span
                        className="text-[0.7rem]"
                        style={{ color: "var(--fg-tertiary)" }}
                      >
                        {c._count?.items ?? 0}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {!notLoggedIn && (
            <div
              className="p-2 flex gap-1.5"
              style={{ borderTop: "1px solid var(--border)" }}
            >
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && createCollection()}
                placeholder="新建收藏夹"
                className="field flex-1 !py-1.5 !px-2.5 text-xs"
              />
              <button
                onClick={createCollection}
                disabled={creating || !newName.trim()}
                className="btn btn-primary h-[1.85rem] w-[1.85rem] p-0 shrink-0"
              >
                {creating ? <IconSpinner size={13} /> : <IconPlus size={14} />}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
