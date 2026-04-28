import dotenv from "dotenv";
dotenv.config();

import axios from "axios";
import fs from "fs/promises";
import { redis , mongodb } from "./storeAndCache/clients.js";

export async function FileReader(file) {
  const Insturactions = await fs.readFile(file, "utf8");

  return Insturactions;
}

export function safeExtractJSON(text) {
  try {
    // remove markdown
    text = text.replace(/```json|```/g, "").trim();

    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");

    if (start === -1 || end === -1) return null;

    const jsonStr = text.slice(start, end + 1);

    let data = JSON.parse(jsonStr);
    return data || "something went wrong";
  } catch (err) {
    console.log("JSON parse failed:", err.message);
    return null;
  }
}

export async function redisFunc(method, data) {

  const key = `rate:${data.id}`;
  const keyMsg = `info:${data.id}:message`;
  const KeyUser = `info:${data.id}:order`;
  if (method === "rate") {
    const count = await redis.incr(key);

    if (count >= 1) {
      await redis.expire(key, 30,"NX");
    }

    const ttl = await redis.ttl(key);
    console.log("COUNT:", count, "TTL:", ttl);

    if (count > 5) {
      return false;
    }

    return true;
  }

    if(method === "getInfo"){
    let res=  await redis.hgetall(KeyUser)
    return res;
  }


 if (method === "cacheHistory") {
    await redis
      .multi()
      .rpush(
        keyMsg,
        JSON.stringify({
          userText: data.UserMessage,
          aiText: data.AImessage,
          time: Date.now(),
        }),
      ).hset(KeyUser,{
        ...data.info
      })
      .expire(keyMsg, 1800, "NX")
      .expire(KeyUser, 1800, "NX")
      .exec();
  }

  await redis.ltrim(keyMsg, -20, -1);

  if (method === "getCachedHistory") {
    let res = await redis.lrange(keyMsg, -20, -1)
    res = res.map((row) => JSON.parse(row));
    let history = res.map((row) => `user said :  (${row.userText}) ==>  ai said : (${row.aiText}) \n `);
    return history || "no history yet";
  }
}






  let urlSend = `https://api.telegram.org/bot${process.env.TELE_BOT_API_KEY}/sendMessage`;

export async function SendMessage(chatId,response, result) {
   try {
    const call = await axios.post(urlSend, {
      chat_id: chatId,
      text: `${response}`,
      reply_markup:
        result?.intent === "submit-res" ||
        result?.intent === "cancel-res" ||
        result?.intent === "detail-res"
          ? {
              inline_keyboard: [
                [{ text: "Submit Your Request", callback_data: "submit" }],
                [{ text: "Cancel Your Request", callback_data: "cancel" }],

                [
                  {
                    text: "Show Details Of Your Request",
                    callback_data: "req-detail",
                  },
                ],
              ],
            }
          : undefined,
    });

    return;
  } catch (err) {
    console.error("WEBHOOK ERROR:", err);
    return;
  }
}




export async function storeinDB(action,data) {
   await mongodb.connect()
  const db = mongodb.db("test")
  const col = db.collection('orders')


  if(action === "submit"){
    await col.insertOne(data)
  }if(action === "cancel"){

  }
}