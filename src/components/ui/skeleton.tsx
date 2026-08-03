import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

/** 加载占位块 */
export function Skeleton({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-[var(--r)]", className)}
      style={{ background: "var(--bg-subtle)" }}
      {...props}
    />
  );
}
