export const config = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: parseInt(process.env.PORT ?? "5000", 10),
  databaseUrl: process.env.DATABASE_URL ?? "",
  sessionSecret: process.env.SESSION_SECRET ?? "dev-secret-change-me",
  tokenEncryptionKeyBase64: process.env.TOKEN_ENCRYPTION_KEY_BASE64 ?? "",
  internalCronSecret: process.env.INTERNAL_CRON_SECRET ?? "",
  allowedEmail: process.env.ALLOWED_EMAIL ?? "",
  mockIntegrations: process.env.MOCK_INTEGRATIONS === "true",
  logLevel: process.env.LOG_LEVEL ?? "info",

  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN ?? "",
    webhookSecret: process.env.TELEGRAM_WEBHOOK_SECRET ?? "",
    webhookPath: process.env.TELEGRAM_WEBHOOK_PATH ?? "/api/telegram/webhook",
    allowedUserId: process.env.TELEGRAM_ALLOWED_USER_ID ?? "",
  },

  google: {
    clientId: process.env.GOOGLE_CLIENT_ID ?? "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    redirectUri: process.env.GOOGLE_REDIRECT_URI ?? "",
  },

  llm: {
    geminiApiKey: process.env.GEMINI_API_KEY ?? "",
    model: process.env.LLM_MODEL ?? "gemini-2.0-flash-lite",
  },

  weather: {
    openMeteoBaseUrl: process.env.OPEN_METEO_BASE_URL ?? "https://api.open-meteo.com/v1",
  },
};
