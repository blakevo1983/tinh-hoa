import { z } from "zod";
export const DisplayNameSchema = z
    .string()
    .trim()
    .min(3, "Display name must be at least 3 characters")
    .max(20, "Display name must not exceed 20 characters")
    .regex(/^[a-zA-Z0-9_\s-]+$/, "Display name can only contain alphanumeric characters, underscores, hyphens, and spaces");
export const SignUpSchema = z.object({
    email: z.string().trim().email("Invalid email address").max(255),
    password: z
        .string()
        .min(8, "Password must be at least 8 characters")
        .max(72, "Password exceeds maximum length"),
    displayName: DisplayNameSchema,
    locale: z.enum(["vi", "en"]).default("vi"),
    turnstileToken: z.string().min(1, "Turnstile verification token is required"),
});
export const SignInSchema = z.object({
    email: z.string().trim().email("Invalid email address").max(255),
    password: z.string().min(1, "Password is required").max(72, "Password exceeds maximum length"),
    turnstileToken: z.string().min(1, "Turnstile verification token is required"),
});
//# sourceMappingURL=auth.js.map