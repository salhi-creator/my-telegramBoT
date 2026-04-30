import express from "express";
import axios from "axios";
import http from "http";

import { AIanswer } from "./AI.js";
import { redisFunc, SendMessage, storeinDB } from "./utilis.js";

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
  let id = data?.message?.message_id;
  let chatId = data?.message?.chat?.id;

  let senderId = data?.message?.from?.id || data?.message?.chat?.id;

  let isSenderBot = data?.message?.from?.is_bot;
  let senderName =
    data?.message?.from?.first_name + (data?.message?.from?.last_name || "");
  let requestType = data?.message?.chat.type;

  let date = data?.message?.date;
  let message = data?.message?.text;
  let response = message;

  // when first time starts the bot
  if (message === "/start") {
    await SendMessage(
      chatId,
      `
👋 Welcome, I’m Hakim’s AI assistant.

I help with bots, web apps, and automation systems.

Just tell me what you need — keep it simple, and I’ll handle the technical side.

⏳ Note: your conversation memory is active for 30 minutes.

📌 You can submit only one request .

If you need anything else or want to go further, you can contact Hakim directly.

So… what can I help you with today?
      `,
    );

    return;
  }
  // handel buttons click
  if (req.body.callback_query) {
    console.log("callback data ", req.body.callback_query);
    let action = req.body.callback_query.data;
    let ID = req.body.callback_query?.message?.chat?.id;
    let name =
      req.body.callback_query?.from?.first_name +
      " " +
      req.body.callback_query?.from?.last_name;

    let history = await redisFunc("getCachedHistory", { id: ID });
    let order = await redisFunc("getInfo", { id: ID });

    console.log("action ", action);

    //console.log("history : ",history)
    let request = null;
    if (action === "submit") {
      let iso = new Date().toISOString();
      request = await storeinDB("submit", {
        ...order,
        createdAt: iso,
        status: "active",
      });

      // mongo db store
      /*   let createdAt = new Date().toLocaleString("en-GB", {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });*/
    }

    if (action === "cancel") {
      // mongo db delete
      request = await storeinDB("cancel", { chat_id: order.chat_id });
    }

    let CallBackMessage = `USER HISTORY MESSAGES WHIT YOU :\n ${history} \n USER INFO : \n- FullName : ${name}\n- CHAT_ID: ${ID}\n ORDERS :\n
    \n
      set "user-attempt" : ${action === "submit" ? "submitted" : "canceled"}
    \n
     ${action === "submit" ? `you should tell the user ${request?.msg ? request.msg : `that his request has been set decent way if value are equal 1 otherwise you tell him his request not setted and he must try again => value=(${request}), ,user he must be clicked the submit button ,don't ask for clicking`} ` : ""} 
     ${action === "cancel" ? `you should tell the user that his request has been canceled decent way if value are equal 1 ,otherwise you tell him his request not setted and he must try again => value=(${request}) ,he must be clicked the cancel button .don't ask for clicking` : ""} 
    \n`;

    let result = await AIanswer(CallBackMessage);
    await SendMessage(ID, result?.message || null, null);
    console.log(result);
    response = result?.message ? result?.message : "wait a minute";
    delete result.message;
    await redisFunc("cacheHistory", {
      id: ID,
      AImessage: response,
      UserMessage: `I ${action}ed`,
      info: { ...result.user, ...result.info },
    });
    return;
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
      let order = await redisFunc("getInfo", { id: senderId });
      //console.log("history : ",history)
      let AImessage = `PREVIOUS DETAILS INCLUDED: ${order} \n ${text} USER HISTORY MESSAGES WHIT YOU : \n${history ?? "do not exist yet"} \n `;
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
  await SendMessage(chatId, response, result);
  return;
});
