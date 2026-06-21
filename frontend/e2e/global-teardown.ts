import fs from "fs";
import path from "path";

const envLocalPath = path.join(__dirname, "..", ".env.local");

export default async function globalTeardown() {
  if (fs.existsSync(envLocalPath)) {
    fs.unlinkSync(envLocalPath);
  }
}
