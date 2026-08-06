import { z } from "zod";
import {
    credentialsSchema,
    MIN_PASSWORD_LENGTH,
    MAX_PASSWORD_LENGTH,
} from "@/lib/auth/credentials";

// Sign-up adds a confirmation field. The email and password rules themselves are NOT
// redeclared here — they are imported from the one place they live (C-11, NFR-043).
export const signUpFormSchema = credentialsSchema
    .extend({ confirmPassword: z.string() })
    .refine((v) => v.password === v.confirmPassword, {
        path: ["confirmPassword"],
        message: "Both passwords need to match.",
    });

export const passwordResetRequestSchema = z.object({
    email: credentialsSchema.shape.email,
});

export const passwordUpdateSchema = z.object({
    password: z.string().min(MIN_PASSWORD_LENGTH).max(MAX_PASSWORD_LENGTH),
});

export type SignUpForm = z.infer<typeof signUpFormSchema>;
export type PasswordResetRequest = z.infer<typeof passwordResetRequestSchema>;
export type PasswordUpdate = z.infer<typeof passwordUpdateSchema>;