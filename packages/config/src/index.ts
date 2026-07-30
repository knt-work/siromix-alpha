import { z } from "zod";

const secretNames = [
  "JWT_PRIVATE_KEY",
  "REFRESH_TOKEN_PEPPER",
  "STORAGE_SECRET_KEY",
] as const;
export const environmentSchema = z.enum([
  "local",
  "test",
  "staging",
  "production",
]);
export const baseConfigSchema = z
  .object({
    SIROMIX_ENV: environmentSchema,
    CONFIG_VERSION: z.string().regex(/^\d+$/),
    DATABASE_URL: z.string().startsWith("postgresql://"),
    WEB_ORIGIN: z.string().url(),
    API_ORIGIN: z.string().url(),
  })
  .strict();
export type BaseConfig = z.infer<typeof baseConfigSchema>;
export function parseConfig(input: Record<string, unknown>): BaseConfig {
  const parsed = baseConfigSchema.parse(input);
  if (
    parsed.SIROMIX_ENV === "production" &&
    !parsed.API_ORIGIN.startsWith("https://")
  ) {
    throw new Error("CONFIG_INSECURE_PRODUCTION_ORIGIN");
  }
  return parsed;
}
export function assertNoBrowserSecrets(input: Record<string, unknown>): void {
  for (const name of secretNames)
    if (name in input || `NEXT_PUBLIC_${name}` in input) {
      throw new Error("CONFIG_BROWSER_SECRET_FORBIDDEN");
    }
}
