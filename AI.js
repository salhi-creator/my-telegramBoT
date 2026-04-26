import { FileReader, safeExtractJSON } from "./utilis.js";
import { groq } from "./AImodels/Groq.js";
import { gemini } from "./AImodels/Gemini.js";
import { mistral } from "./AImodels/mistral.js";

export async function AIanswer(message) {
  let msg =  await FileReader("./instruction.txt");
  msg = `
SYSTEM INSTRUCTIONS:
${msg}
USER:
${message}

`;

  try {
    const res = await gemini(msg);
    const parsed = safeExtractJSON(res);
    if (parsed) return parsed;
  } catch (err) {
    console.log("Gemini failed:", err.message);
  }

  // 2️⃣ Groq (MAIN)
  try {
    const res = await groq(msg);
    const parsed = safeExtractJSON(res);
    if (parsed) return parsed;
  } catch (err) {
    console.log("Groq failed:", err.message);
  }

  // 3️⃣ Mistral (optional - currently broken)
  try {
    const res = await mistral(msg);
    const parsed = safeExtractJSON(res);
    if (parsed) return parsed;
  } catch (err) {
    console.log("Mistral failed:", err.message);
  }
}
