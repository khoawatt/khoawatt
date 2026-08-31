export type DeleteErrorCode =
  | "DELETE_NOT_FOUND"
  | "DELETE_DEPENDENCY_EXISTS"
  | "DELETE_PROTECTED"
  | "DELETE_ALREADY_DELETED"
  | "DELETE_NOT_ALLOWED"
  | "DELETE_NOT_YET_ELIGIBLE";

export type DeleteStatus = "deleted" | "blocked" | "failed";

export interface DeleteResult {
  status: DeleteStatus;
  entity: string;
  id: string;
  dependencies?: Array<{ entity: string; id: string; field: string; count: number; type?: string }>;
  errorCode?: DeleteErrorCode;
  errorMessage?: string;
  reassigned?: number;
  operation?: string;
}

export function parseDeleteResult(data: unknown): DeleteResult | null {
  if (!data || typeof data !== "object" || !("status" in data)) return null;
  return data as DeleteResult;
}

export function deleteResultToMessage(result: DeleteResult, locale: "en" | "vi" = "en"): string {
  if (result.status === "deleted") return locale === "vi" ? "Đã chuyển vào Trash." : "Moved to Trash.";
  if (result.errorCode === "DELETE_PROTECTED") return locale === "vi" ? "Không thể xóa mục mặc định." : "Cannot delete protected item.";
  if (result.errorCode === "DELETE_DEPENDENCY_EXISTS") {
    const count = (result as unknown as { dependencyCount?: number }).dependencyCount ?? result.dependencies?.[0]?.count ?? 0;
    return locale === "vi"
      ? `Không thể xóa: còn ${count} mục liên quan.`
      : `Cannot delete: still referenced by ${count} item(s).`;
  }
  if (result.errorCode === "DELETE_NOT_YET_ELIGIBLE") {
    return locale === "vi" ? "Chưa đến hạn xóa vĩnh viễn (30 ngày)." : "Not yet eligible for permanent delete (30 days).";
  }
  return result.errorMessage ?? result.errorCode ?? "Delete failed.";
}
