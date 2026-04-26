import dotenv from "dotenv";
dotenv.config();

import Redis from "ioredis";
export const redis = new Redis(
  {
    host: process.env.REDIS_HOST,
    port: 12694,
    username: "default",
    password: process.env.REDIS_PASSWORD,
  },
  {
    retryStrategy(times) {
      return Math.min(times * 100, 2000);
    },
    maxRetriesPerRequest: null, // important for long blocking calls
  },
);

redis.on("connect", () => {
  console.log("✅ Redis connected");
});

redis.on("ready", () => {
  console.log("🚀 Redis ready");
});

redis.on("close", () => {
  console.log("🔌 Redis connection closed");
});

redis.on("reconnecting", () => {
  console.log("🔄 Redis reconnecting...");
});
/*
await Redisredis.connect();

await Redisredis.set('foo', 'bar');
const result = await Redisredis.get('foo');
console.log(result)  // >>> bar

*/
