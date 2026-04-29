import dotenv from "dotenv";
dotenv.config();

import axios from "axios";
import fs from "fs/promises";
import { redis, mongodb } from "./storeAndCache/clients.js";
import { escape } from "querystring";

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
      await redis.expire(key, 30, "NX");
    }

    const ttl = await redis.ttl(key);
    console.log("COUNT:", count, "TTL:", ttl);

    if (count > 5) {
      return false;
    }

    return true;
  }

  if (method === "getInfo") {
    let res = await redis.hgetall(KeyUser);
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
      )
      .hset(KeyUser, {
        ...data.info,
      })
      .expire(keyMsg, 1800, "NX")
      .expire(KeyUser, 1800, "NX")
      .exec();
  }

  await redis.ltrim(keyMsg, -20, -1);

  if (method === "getCachedHistory") {
    let res = await redis.lrange(keyMsg, -20, -1);
    res = res.map((row) => JSON.parse(row));
    let history = res.map(
      (row) =>
        `user said :  (${row.userText}) ==>  ai said : (${row.aiText}) \n `,
    );
    return history || "no history yet";
  }
}

let urlSend = `https://api.telegram.org/bot${process.env.TELE_BOT_API_KEY}/sendMessage`;

export async function SendMessage(chatId, response, result) {
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

export async function storeinDB(action, data) {
  await mongodb.connect();
  const db = mongodb.db("test");
  const col = db.collection("orders");

  try {
    if (action === "submit") {
      // check if order exists brfore
      let exist = await col.findOne({ cha_id: data.cha_id });
      if ((exist && escape.status === "canceled") || !exist) {
        await col.insertOne(data);
      } else if (exist && escape.status !== "canceled") {
        return {
          msg: " we already have one request on our queue by his name , and he can only ask for one request till the developer cover it  , or he should contact him personally if he want something else",
        };
      }
    } else if (action === "cancel") {
      await col.updateOne(
        { chat_id: data.chat_id },
        { $set: { status: "canceled" } },
      );
    }
    return 1;
  } catch (err) {
    console.log(err);
    return 0;
  }
}
