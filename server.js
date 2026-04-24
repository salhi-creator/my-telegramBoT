import express from "express";
import axios from "axios";
import http from "http";

import { AIanswer } from "./AI.js";

const app = express();
import dotenv from "dotenv";
dotenv.config();
const port = process.env.PORT || 3500;
const server = http.createServer(app);
app.use(express.json());
server.listen(port, () => {
  console.log("bot server is working");
});



app.post("/webhook", async (req, res) => {
  console.log("webHook telegram shit : ", req.body);
  if (!req.body) {
    return res.sendStatus(500);
  }
  if (!req.body.message) return res.sendStatus(200);

  let data = req.body;
  let id = data.message.message_id;
  let chatId = data.message.chat.id;

  let senderId = data.message.from.id;
  let isSenderBot = data.message.from.is_bot;
  let senderName =
    data.message.from.first_name + (data.message.from.last_name || "");
  let requestType = data.message.chat.type;

  let date = data.message.date;
  let message = data.message.text;

  let response = message;

  try {
    response = await AIanswer(message);
  } catch (err) {
    console.log("gemini error ", err);
    response =
      "please excuse me a bit , i have something to do first then i'll come back to ya";
  }
  try {
    let urlSend = `https://api.telegram.org/bot${process.env.TELE_BOT_API_KEY}/sendMessage`;
    const call = await axios.post(urlSend, {
      chat_id: chatId,
      text: `${response}`,
    });

    return res.sendStatus(200);
  } catch (err) {
    console.error("WEBHOOK ERROR:", err);

    return res.sendStatus(200);
  }
});


