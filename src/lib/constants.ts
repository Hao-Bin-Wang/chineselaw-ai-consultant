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

/** 效力状态对应的徽标类名（见 globals.css） */
export const statusBadgeClass: Record<string, string> = {
  effective: "badge-success",
  amended: "badge-warning",
  repealed: "badge-danger",
};
