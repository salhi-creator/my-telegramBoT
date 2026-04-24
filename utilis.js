import fs from "fs/promises";
export async function FileReader(file) {
  const Insturactions = await fs.readFile(file, "utf8");

  return Insturactions;
}