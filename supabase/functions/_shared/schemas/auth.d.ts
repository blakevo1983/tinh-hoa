import { z } from "zod";
export declare const DisplayNameSchema: z.ZodString;
export declare const SignUpSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
    displayName: z.ZodString;
    locale: z.ZodDefault<z.ZodEnum<["vi", "en"]>>;
    turnstileToken: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
    displayName: string;
    locale: "vi" | "en";
    turnstileToken: string;
}, {
    email: string;
    password: string;
    displayName: string;
    turnstileToken: string;
    locale?: "vi" | "en" | undefined;
}>;
export type SignUpInput = z.infer<typeof SignUpSchema>;
export declare const SignInSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
    turnstileToken: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
    turnstileToken: string;
}, {
    email: string;
    password: string;
    turnstileToken: string;
}>;
export type SignInInput = z.infer<typeof SignInSchema>;
//# sourceMappingURL=auth.d.ts.map