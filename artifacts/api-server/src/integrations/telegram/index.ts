export interface TelegramMessage {
  chatId: string;
  text: string;
  parseMode?: "HTML" | "Markdown";
  replyMarkup?: unknown;
}

export interface TelegramAdapter {
  readonly connected: boolean;
  readonly mock: boolean;

  sendMessage(message: TelegramMessage): Promise<{ messageId: string }>;
  deleteMessage(chatId: string, messageId: string): Promise<void>;
  healthCheck(): Promise<{ ok: boolean; error?: string }>;
}
