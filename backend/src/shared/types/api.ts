export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export type ApiErrorCode =
  | "INVALID_REQUEST"
  | "PAYLOAD_TOO_LARGE"
  | "INVALID_URL"
  | "ANALYSIS_FAILED"
  | "EXTERNAL_SERVICE_UNAVAILABLE"
  | "INTERNAL_ERROR";

export interface ApiFailure {
  success: false;
  message: string;
  errorCode: ApiErrorCode;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;
