import { z } from "zod";

export const MIN_PASSWORD_LENGTH = 10;
export const MAX_PASSWORD_LENGTH = 128;

export const credentialsSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(3)
    .max(320)
    .refine((value) => /^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(value), {
      message: "Enter a valid email address.",
    }),
  password: z.string().min(MIN_PASSWORD_LENGTH).max(MAX_PASSWORD_LENGTH),
});

export type Credentials = z.infer<typeof credentialsSchema>;

export function readCredentials(body: unknown):
  | { ok: true; value: Credentials }
  | { ok: false; message: string } {
  const parsed = credentialsSchema.safeParse(body);

  if (parsed.success) {
    return { ok: true, value: parsed.data };
  }

  const issue = parsed.error.issues[0];
  const field = issue?.path.join(".") ?? "request";

  if (field === "password") {
    return {
      ok: false,
      message: `Password must be between ${MIN_PASSWORD_LENGTH} and ${MAX_PASSWORD_LENGTH} characters.`,
    };
  }

  return { ok: false, message: "Enter a valid email address." };
}
