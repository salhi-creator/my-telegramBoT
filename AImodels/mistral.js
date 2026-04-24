import dotenv from "dotenv";
dotenv.config();

import axios from "axios";

export async function mistral(message) {
  const res = await axios.post(
    "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.3",
    {
      inputs: message,
      parameters: {
        max_new_tokens: 200,
        temperature: 0.7,
      },
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.HF_MISTRALAI_API_KEY}`,
      },
    }
  );

  return res.data?.[0]?.generated_text;
}