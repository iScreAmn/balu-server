const parseChatIds = (value) => {
  if (!value) return [];
  return String(value)
    .split(",")
    .map((v) => v.trim())
    .map((v) => v.replace(/^['"]|['"]$/g, ""))
    .filter(Boolean);
};

export const getTelegramConfig = () => {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatIds = parseChatIds(String(process.env.TELEGRAM_CHAT_ID ?? "").trim());

  return { token, chatIds };
};

export const isTelegramEnabled = () => {
  const { token, chatIds } = getTelegramConfig();
  return Boolean(token && chatIds.length);
};
