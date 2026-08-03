"use client";

import { useState, useEffect, useCallback } from "react";
import { IconUpload, IconSpinner } from "@/components/icons";

interface ImportTask {
  id: string;
  fileName: string;
  status: string;
  progress: number;
  error: string | null;
  createdAt: string;
}

const statusLabels: Record<string, string> = {
  pending: "等待中",
  parsing: "解析中",
  chunking: "拆分中",
  embedding: "向量化中",
  done: "已完成",
  failed: "失败",
};

const statusBadge: Record<string, string> = {
  done: "badge-success",
  failed: "badge-danger",
};

export default function AdminPage() {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [type, setType] = useState("law");
  const [uploading, setUploading] = useState(false);
  const [tasks, setTasks] = useState<ImportTask[]>([]);

  const fetchTasks = useCallback(async () => {
    const res = await fetch("/api/admin/import/status");
    const json = await res.json();
    if (json.success) setTasks(json.data);
  }, []);

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, 3000);
    return () => clearInterval(interval);
  }, [fetchTasks]);

  async function upload() {
    if (!file || !title.trim()) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", title);
    formData.append("type", type);

    try {
      const res = await fetch("/api/admin/import", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (json.success) {
        setFile(null);
        setTitle("");
        fetchTasks();
      } else {
        alert(json.error);
      }
    } catch {
      alert("上传失败");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-5 py-7">
      <header className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight">知识库管理</h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--fg-secondary)" }}>
          导入法律法规文件，系统将自动拆分条文并生成向量索引
        </p>
      </header>

      {/* 上传表单 */}
      <section className="card p-5 mb-5">
        <h2 className="text-sm font-semibold mb-4">导入新法规</h2>

        <div className="space-y-4">
          <Field label="法规名称">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="如：中华人民共和国劳动合同法"
              className="field"
            />
          </Field>

          <Field label="法规类型">
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="field"
            >
              <option value="law">法律</option>
              <option value="regulation">行政法规</option>
              <option value="judicial_interpretation">司法解释</option>
              <option value="rule">部门规章</option>
            </select>
          </Field>

          <Field label="文件（PDF / Word / JSON）">
            <label
              className="flex items-center gap-2.5 px-3.5 py-3 cursor-pointer"
              style={{
                border: "1px dashed var(--border-strong)",
                borderRadius: "var(--r)",
                background: "var(--bg-subtle)",
              }}
            >
              <span style={{ color: "var(--fg-tertiary)" }}>
                <IconUpload size={17} />
              </span>
              <span
                className="text-sm truncate"
                style={{
                  color: file ? "var(--fg)" : "var(--fg-tertiary)",
                }}
              >
                {file ? file.name : "点击选择文件"}
              </span>
              <input
                type="file"
                accept=".pdf,.docx,.doc,.json"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="hidden"
              />
            </label>
          </Field>

          <button
            onClick={upload}
            disabled={!file || !title.trim() || uploading}
            className="btn btn-primary h-9 px-4 text-sm"
          >
            {uploading ? (
              <>
                <IconSpinner size={14} />
                上传中…
              </>
            ) : (
              "开始导入"
            )}
          </button>
        </div>
      </section>

      {/* 任务列表 */}
      <section className="card p-5">
        <h2 className="text-sm font-semibold mb-4">导入任务</h2>

        {tasks.length === 0 ? (
          <p
            className="text-sm text-center py-6"
            style={{ color: "var(--fg-tertiary)" }}
          >
            暂无导入任务
          </p>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => {
              const running =
                task.status !== "done" && task.status !== "failed";
              return (
                <div key={task.id}>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{task.fileName}</p>
                      {task.error && (
                        <p
                          className="text-xs mt-0.5 line-clamp-1"
                          style={{ color: "var(--danger)" }}
                        >
                          {task.error}
                        </p>
                      )}
                    </div>
                    <span className={`badge shrink-0 ${statusBadge[task.status] ?? ""}`}>
                      {statusLabels[task.status] || task.status}
                      {running && ` ${task.progress}%`}
                    </span>
                  </div>

                  {running && (
                    <div
                      className="h-1 mt-2 overflow-hidden"
                      style={{
                        background: "var(--bg-subtle)",
                        borderRadius: "2px",
                      }}
                    >
                      <div
                        className="h-full transition-all duration-500"
                        style={{
                          width: `${task.progress}%`,
                          background: "var(--accent)",
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        className="block text-xs font-medium mb-1.5"
        style={{ color: "var(--fg-secondary)" }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}
