export type ErrorCode =
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "rate_limited"
  | "spend_capped"
  | "validation_failed"
  | "generation_failed"
  | "payment_required"
  | "hosting_error"
  | "internal";
