import { FileReader } from "./utilis.js";
import { groq } from "./AImodels/Groq.js";
import { gemini } from "./AImodels/Gemini.js";
export async function AIanswer(message) {
  let msg = await FileReader("./instruction.txt");
  msg = `
SYSTEM INSTRUCTIONS:
${msg}

USER:
${message}

`;
  try {
    return await gemini(msg);
  } catch (err) {
    console.log("Gemini failed:", err);
  }

  try {
    return await groq(msg);
  } catch (err) {
    console.log("Groq failed:", err);
  }
}
