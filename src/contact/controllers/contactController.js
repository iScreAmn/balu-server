import { refreshTelegramEnv } from "../../../loadEnv.js";
import {
  sendCallbackTelegramNotification,
  sendCalculatorTelegramNotification,
} from "../../telegram/services/notifications.js";
import { isTelegramEnabled } from "../../telegram/config/telegram.js";

const phoneRegex = /^\+?[0-9]{7,15}$/;

const normalizePhone = (phone) => {
  if (!phone) return "";
  const cleaned = phone.replace(/[^\d+]/g, "");
  if (cleaned.startsWith("00")) {
    return `+${cleaned.slice(2)}`;
  }
  if (cleaned.startsWith("+")) return cleaned;
  if (cleaned.length === 11 && cleaned.startsWith("8")) {
    return `+7${cleaned.slice(1)}`;
  }
  if (cleaned.length >= 10 && !cleaned.startsWith("+")) {
    return `+${cleaned}`;
  }
  return cleaned;
};

const isPhoneMethod = (method) => !method || /тел|phone|whats/i.test(method);

export const submitContact = async (req, res) => {
  try {
    const { name, phone, message, agree, _company, contactMethod, contactValue } = req.body;

    if (typeof _company === "string" && _company.trim()) {
      return res.status(200).json({
        success: true,
        message: "Спасибо! Заявка принята.",
      });
    }

    refreshTelegramEnv();

    if (!isTelegramEnabled()) {
      return res.status(503).json({
        success: false,
        message: "Сервис уведомлений не настроен. Обратитесь к администратору сайта.",
      });
    }

    // Поддерживаем как новый формат (способ связи + контакт),
    // так и устаревший (только телефон).
    const method = typeof contactMethod === "string" ? contactMethod.trim() : "";
    const rawContact = String(contactValue ?? phone ?? "").trim();

    if (!name || !rawContact) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
        required: ["name", method ? "contactValue" : "phone"],
      });
    }

    if (agree !== true && agree !== "true") {
      return res.status(400).json({
        success: false,
        message: "Необходимо согласие на обработку персональных данных",
      });
    }

    // Телефон валидируем по формату только для звонка/WhatsApp.
    let contactDisplay = rawContact;
    if (isPhoneMethod(method)) {
      const normalizedPhone = normalizePhone(rawContact);
      if (!phoneRegex.test(normalizedPhone)) {
        return res.status(400).json({
          success: false,
          message: "Invalid phone format. Expected 7-15 digits (optionally with +).",
        });
      }
      contactDisplay = normalizedPhone;
    }

    const payload = {
      name: String(name).trim(),
      method: method || "Телефон",
      contact: contactDisplay,
      phone: isPhoneMethod(method) ? contactDisplay : "",
      message: typeof message === "string" ? message.trim() : "",
      agree: true,
      submitted_at: new Date().toLocaleString("ru-RU", {
        timeZone: "Europe/Moscow",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
      ip: req.ip || req.connection?.remoteAddress,
    };

    try {
      await sendCallbackTelegramNotification(payload);
    } catch (err) {
      console.error("Callback telegram failed:", err?.message || err, err?.details || "");
      return res.status(500).json({
        success: false,
        message: "Ошибка при отправке заявки. Пожалуйста, попробуйте позже.",
        error: process.env.NODE_ENV === "development" ? err?.message : undefined,
      });
    }

    console.log("Callback submission ok:", {
      name: payload.name,
      method: payload.method,
      contact: payload.contact,
      timestamp: payload.submitted_at,
    });

    return res.status(200).json({
      success: true,
      message: "Заявка успешно отправлена!",
      data: {
        timestamp: payload.submitted_at,
      },
    });
  } catch (error) {
    console.error("Contact submission error:", error);
    return res.status(500).json({
      success: false,
      message: "Ошибка при отправке заявки. Пожалуйста, попробуйте позже.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

export const submitCalculator = async (req, res) => {
  try {
    const { services, balconyType, balconyArea, name, contactMethod, contactValue, _company } =
      req.body;

    if (typeof _company === "string" && _company.trim()) {
      return res.status(200).json({ success: true, message: "Спасибо! Заявка принята." });
    }

    refreshTelegramEnv();

    if (!isTelegramEnabled()) {
      return res.status(503).json({
        success: false,
        message: "Сервис уведомлений не настроен. Обратитесь к администратору сайта.",
      });
    }

    if (!name || !contactMethod || !contactValue) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
        required: ["name", "contactMethod", "contactValue"],
      });
    }

    const payload = {
      services: Array.isArray(services) ? services.map((s) => String(s).trim()) : [],
      balconyType: typeof balconyType === "string" ? balconyType.trim() : "",
      balconyArea: typeof balconyArea === "string" ? balconyArea.trim() : "",
      name: String(name).trim(),
      contactMethod: String(contactMethod).trim(),
      contactValue: String(contactValue).trim(),
      submitted_at: new Date().toLocaleString("ru-RU", {
        timeZone: "Europe/Moscow",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
      ip: req.ip || req.connection?.remoteAddress,
    };

    try {
      await sendCalculatorTelegramNotification(payload);
    } catch (err) {
      console.error("Calculator telegram failed:", err?.message || err, err?.details || "");
      return res.status(500).json({
        success: false,
        message: "Ошибка при отправке заявки. Пожалуйста, попробуйте позже.",
        error: process.env.NODE_ENV === "development" ? err?.message : undefined,
      });
    }

    console.log("Calculator submission ok:", {
      name: payload.name,
      contactMethod: payload.contactMethod,
      timestamp: payload.submitted_at,
    });

    return res.status(200).json({
      success: true,
      message: "Заявка успешно отправлена!",
      data: { timestamp: payload.submitted_at },
    });
  } catch (error) {
    console.error("Calculator submission error:", error);
    return res.status(500).json({
      success: false,
      message: "Ошибка при отправке заявки. Пожалуйста, попробуйте позже.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
