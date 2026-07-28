export const typeLabels: Record<string, string> = {
  "": "全部",
  law: "法律",
  regulation: "行政法规",
  judicial_interpretation: "司法解释",
  rule: "部门规章",
};

export const statusLabels: Record<string, string> = {
  effective: "现行有效",
  amended: "已修正",
  repealed: "已废止",
};

export const statusColors: Record<string, string> = {
  effective: "text-[var(--gold)]",
  amended: "text-amber-500",
  repealed: "text-red-500",
};
