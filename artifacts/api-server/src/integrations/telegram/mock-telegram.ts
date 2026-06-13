import { v4 as uuidv4 } from "uuid";
import type { TelegramAdapter, TelegramMessage } from "./index";
import { logger } from "../../lib/logger";

export class MockTelegramAdapter implements TelegramAdapter {
  readonly connected = false;
  readonly mock = true;

  private readonly sentMessages: Array<{ id: string; message: TelegramMessage; sentAt: Date }> = [];

  async sendMessage(message: TelegramMessage): Promise<{ messageId: string }> {
    const messageId = `mock-tg-${uuidv4()}`;
    this.sentMessages.push({ id: messageId, message, sentAt: new Date() });
    logger.info({ messageId, chatId: message.chatId, textPreview: message.text.slice(0, 80) }, "[MockTelegram] sendMessage");
    return { messageId };
  }

  async deleteMessage(chatId: string, messageId: string): Promise<void> {
    logger.info({ chatId, messageId }, "[MockTelegram] deleteMessage");
  }

  async healthCheck(): Promise<{ ok: boolean; error?: string }> {
    return { ok: true };
  }

  getSentMessages() {
    return this.sentMessages;
  }
}
