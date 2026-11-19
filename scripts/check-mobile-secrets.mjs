import { readdir, readFile, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import process from "node:process";

const root = resolve(process.argv[2] || "dist/mobile/client");
const forbidden = [
  /GEMINI_API_KEY/i,
  /GROQ_API_KEY/i,
  /NVIDIA_API_KEY/i,
  /OPENROUTER_API_KEY/i,
  /UPSTASH_REDIS_REST_(?:URL|TOKEN)/i,
  /AIza[0-9A-Za-z_-]{30,}/,
  /gsk_[A-Za-z0-9]{20,}/,
  /nvapi-[A-Za-z0-9_-]{20,}/,
  /sk-or-v1-[A-Fa-f0-9]{32,}/,
];
const findings = [];

async function walk(path) {
  for (const entry of await readdir(path, { withFileTypes: true })) {
    const fullPath = join(path, entry.name);
    if (entry.isDirectory()) {
      await walk(fullPath);
    } else if (entry.isFile()) {
      const content = (await readFile(fullPath)).toString("latin1");
      if (forbidden.some((pattern) => pattern.test(content))) findings.push(fullPath);
    }
  }
}

try {
  if (!(await stat(root)).isDirectory()) throw new Error("scan target is not a directory");
  await walk(root);
} catch (error) {
  console.error(`Mobile secret scan could not inspect ${root}: ${error.message}`);
  process.exit(2);
}

if (findings.length) {
  console.error(
    `Mobile secret scan failed: suspicious credential markers found in ${findings.length} file(s).`,
  );
  for (const path of findings) console.error(`- ${path}`);
  process.exit(1);
}
console.log(`Mobile secret scan passed (${root}).`);
