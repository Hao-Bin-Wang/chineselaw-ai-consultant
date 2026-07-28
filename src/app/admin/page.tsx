"use client";

import { useState, useEffect, useCallback } from "react";

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
  done: "完成",
  failed: "失败",
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
      const res = await fetch("/api/admin/import", { method: "POST", body: formData });
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
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-xl font-bold mb-6">知识库管理</h1>

      <div className="p-6 mb-6 rounded-xl border bg-card">
        <h2 className="font-medium mb-4">导入法律法规</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">法规名称</label>
            <input
              placeholder="如：中华人民共和国劳动合同法"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">法规类型</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="law">法律</option>
              <option value="regulation">行政法规</option>
              <option value="judicial_interpretation">司法解释</option>
              <option value="rule">部门规章</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">选择文件（PDF / Word / JSON）</label>
            <input
              type="file"
              accept=".pdf,.docx,.doc,.json"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full text-sm"
            />
          </div>
          <button
            onClick={upload}
            disabled={!file || !title.trim() || uploading}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium disabled:opacity-50 hover:bg-primary/90 transition-colors"
          >
            {uploading ? "上传中..." : "开始导入"}
          </button>
        </div>
      </div>

      <div className="p-6 rounded-xl border bg-card">
        <h2 className="font-medium mb-4">导入任务</h2>
        {tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">暂无导入任务</p>
        ) : (
          tasks.map((task) => (
            <div key={task.id} className="flex items-center justify-between py-3 border-b last:border-0">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{task.fileName}</p>
                <p className="text-xs text-muted-foreground">
                  {statusLabels[task.status] || task.status}
                  {task.error && <span className="text-red-500 ml-2">错误：{task.error}</span>}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-4">
                {task.status !== "done" && task.status !== "failed" && (
                  <div className="w-24 bg-muted rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{ width: `${task.progress}%` }}
                    />
                  </div>
                )}
                <span className="text-xs text-muted-foreground w-8 text-right">
                  {task.status === "done" ? "✅" : task.status === "failed" ? "❌" : `${task.progress}%`}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}