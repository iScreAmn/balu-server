import { sendTelegramMessage, telegram } from "./telegramClient.js";

const { escapeHtml } = telegram;

const linesToHtml = (lines) => lines.filter(Boolean).join("\n");

/** Заявка из калькулятора */
export const sendCalculatorTelegramNotification = async (data) => {
  const servicesList = Array.isArray(data.services) && data.services.length
    ? data.services.map((s) => `• ${escapeHtml(s)}`).join("\n")
    : "—";

  const html = linesToHtml([
    `<b>Заявка из калькулятора «Балу»</b>`,
    ``,
    `<b>Услуги:</b>`,
    servicesList,
    ``,
    `<b>Тип балкона:</b> ${escapeHtml(data.balconyType || "—")}`,
    `<b>Площадь:</b> ${escapeHtml(data.balconyArea || "—")}`,
    ``,
    `<b>Имя:</b> ${escapeHtml(data.name || "—")}`,
    `<b>Способ связи:</b> ${escapeHtml(data.contactMethod || "—")}`,
    `<b>Контакт:</b> ${escapeHtml(data.contactValue || "—")}`,
    ``,
    `<b>Отправлено:</b> ${escapeHtml(data.submitted_at)}`,
    ...(data.ip ? [`<b>IP:</b> ${escapeHtml(data.ip)}`] : []),
  ]);

  return sendTelegramMessage(html);
};

/** Заявка «Заказать звонок» с сайта Балу */
export const sendCallbackTelegramNotification = async (data) => {
  const html = linesToHtml([
    `<b>Заказ звонка с сайта «Балу»</b>`,
    ``,
    `<b>Имя:</b> ${escapeHtml(data.name)}`,
    `<b>Телефон:</b> ${escapeHtml(data.phone)}`,
    `<b>Сообщение:</b> ${escapeHtml(data.message || "—")}`,
    `<b>Согласие на обработку данных:</b> ${data.agree ? "Да" : "Нет"}`,
    ``,
    `<b>Отправлено:</b> ${escapeHtml(data.submitted_at)}`,
    ...(data.ip ? [`<b>IP:</b> ${escapeHtml(data.ip)}`] : []),
  ]);

  return sendTelegramMessage(html);
};
