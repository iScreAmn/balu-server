import express from "express";
import { submitContact, submitCalculator } from "../controllers/contactController.js";

const router = express.Router();

router.get("/submit", (req, res) => {
  res.status(405).set("Allow", "POST, OPTIONS").json({
    success: false,
    message:
      "Нужен метод POST (в браузере по ссылке уходит GET). Пример: curl -X POST http://127.0.0.1:3002/api/contact/submit -H \"Content-Type: application/json\" -d '{\"name\":\"Тест\",\"phone\":\"+79991234567\",\"agree\":true,\"message\":\"\",\"_company\":\"\"}'",
  });
});

router.post("/submit", submitContact);

router.post("/submit-calculator", submitCalculator);

router.get("/test", (req, res) => {
  res.json({
    success: true,
    message: "Contact API is working",
    timestamp: new Date().toISOString(),
  });
});

export default router;
