import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { importQueue } from "@/lib/queue";
import { writeFile } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ success: false, error: "无权限" }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File;
  const title = formData.get("title") as string;
  const type = formData.get("type") as string;

  if (!file || !title) {
    return NextResponse.json({ success: false, error: "文件和法律名称必填" }, { status: 400 });
  }

  const allowedTypes = [
    "application/pdf",
    "application/json",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json(
      { success: false, error: "仅支持 PDF、Word、JSON 格式" },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = file.name.split(".").pop();
  const fileName = `${randomUUID()}.${ext}`;
  const filePath = join(process.cwd(), "uploads", fileName);
  await writeFile(filePath, buffer);

  const task = await prisma.importTask.create({
    data: {
      fileName: file.name,
      status: "pending",
      createdBy: session.userId,
    },
  });

  await importQueue.add("import", {
    taskId: task.id,
    filePath,
    fileName: file.name,
    legislationTitle: title,
    legislationType: type,
  });

  return NextResponse.json({ success: true, data: { taskId: task.id } });
}