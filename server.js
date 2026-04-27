import express from "express";
import axios from "axios";
import http from "http";

import { AIanswer } from "./AI.js";
import { redisFunc, SendMessage } from "./utilis.js";

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
  res.sendStatus(200); // FIRST LINE
  console.log("webHook telegram shit : ", req.body);
  if (!req.body) {
    return;
  }
  console.log(req.body);

  let data = req.body;
  let id = data.message?.message_id;
  let chatId = data.message.chat.id;

  let senderId = data?.message?.from?.id || data?.message?.chat?.id;

  let isSenderBot = data.message.from.is_bot;
  let senderName =
    data.message.from.first_name + (data.message.from.last_name || "");
  let requestType = data.message.chat.type;

  let date = data.message.date;
  let message = data.message.text;
  let response = message;

  // when first time starts the bot
  if (message === "/start") {
    await SendMessage(chatId,"👋 Welcome, I'm Hakim's AI assistant.\n\nI work with bots, web apps, and automation systems.\n\nExplain what you need—keep it simple, I’ll handle the technical side.")

    return;
  }
  // handel buttons click
  if (req.body.callback_query) {
    let history = await redisFunc("getCachedHistory", { id: senderId });
    let action = req.body.callback_query.data;

    console.log("action ", action);

    //console.log("history : ",history)

    let CallBackMessage = `USER HISTORY MESSAGES WHIT YOU :\n ${history} \n USER INFO : \n- FullName : ${senderName}\n- CHAT_ID: ${chatId}\n ORDER :\n
     ${action === "submit" ? "you should tell the user that his request has been set decent way" : ""} 
     ${action === "cancel" ? "you should tell the user that his request has been canceled decent way" : ""} 
     ${action === "req-detail" ? "you give the user details of his project answer in message feild " : ""} 
    `;

    let result = await AIanswer(CallBackMessage);

    await SendMessage(chatId,result?.message || null , null)
       
    if (action === "submit") {
      // mongo db store
       
    }
    if (action === "req-detail") {
      
    }
        if (action === "cancel") {
      // mongo db delete
            

    }
    console.log(result);
    response = result?.message ? result?.message : "wait a minute";
    delete result.message;
    await redisFunc("cacheHistory", {
      id: senderId,
      AImessage: response,
      UserMessage: message,
      info: { ...result.user, ...result.info },
    });
  }
  if (!req.body.message && !req.body.callback_query) return;

  // rate limiter checker

  let text = `USER INFO : \n- FullName : ${senderName}\n- CHAT_ID: ${chatId}\n USER MESSAGE : \n${message} \n`;
  let rate = null;
  try {
    rate = await redisFunc("rate", { id: senderId });
    if (!rate) {
      response =
        "you can only send 5 messages every 30 sec for our security policies";
    }
  } catch (err) {
    console.log(err);
    rate = true; // redis fails just allow user
    response =
      "The AI model bot are not avaialable for now, it'll get back soon, Rate Limit Fail";
  }

  // AI model response

  let result = null;
  try {
    if (rate) {
      let history = await redisFunc("getCachedHistory", { id: senderId });

      //console.log("history : ",history)
      let AImessage = `${text} USER HISTORY MESSAGES WHIT YOU : \n${history ?? "do not exist yet"} \n `;
      console.log("AImessage", AImessage);
      result = await AIanswer(AImessage);
      // analyse AI data
      console.log(result);
      response = result?.message ? result?.message : "wait a minute";
      delete result.message;
      await redisFunc("cacheHistory", {
        id: senderId,
        AImessage: response,
        UserMessage: message,
        info: { ...result.user, ...result.info },
      });
    }
  } catch (err) {
    console.log("Ai error ", err);
    response =
      "please excuse me a bit , i have something to do first then i'll come back to ya";
  }

  // send back to client
  await SendMessage(chatId,response, result);
  return;
});
