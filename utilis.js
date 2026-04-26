import dotenv from "dotenv";
dotenv.config();

import fs from "fs/promises";
import { redis } from "./storeAndCache/clients.js";

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

    
    let data = JSON.parse(jsonStr)
    return data || "something went wrong"
    


  } catch (err) {
    console.log("JSON parse failed:", err.message);
    return null;
  }
}

export async function redisFunc(method, data) {
  if (method === "rate") {
    const key = `rate:${data.id}`;

    const count = await redis.incr(key);

    if (count === 1) {
      await redis.expire(key, 30);
    }

    const ttl = await redis.ttl(key);
    console.log("COUNT:", count, "TTL:", ttl);

    if (count > 5) {
      return false;
    }

    return true;
  }
  const key = `info:${data.id}:message`;

  if (method === "cacheHistory") {
    await redis.rpush(
      key,
      JSON.stringify({
        userText: data.UserMessage,
        aiText: data.AImessage,
        time: Date.now(),
      }),
    );
    await redis.expire(key, 1800);
  }

  await redis.ltrim(key, 0, 19);
  if (method === "getCachedHistory") {
    let res = await redis.lrange(key,0,19);
    res = res.map(row => JSON.parse(row))
    let history = res.map(row => 
       `ai said : (${row.aiText}) ==> user said :  (${row.userText})\n`
    );
    return history || null;
  }
  
}
