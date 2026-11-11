export interface ApiErrorDetail {
  code: string;
  message: string;
  field?: string;
  rows?: number[];
  request_id: string;
}

export interface ApiErrorBody {
  error: ApiErrorDetail;
}

export function makeError(
  code: string,
  message: string,
  extra: { field?: string; rows?: number[]; request_id?: string } = {}
): ApiErrorBody {
  return {
    error: {
      code,
      message,
      ...(extra.field ? { field: extra.field } : {}),
      ...(extra.rows && extra.rows.length > 0 ? { rows: extra.rows } : {}),
      request_id: extra.request_id || "req_unknown",
    },
  };
}
