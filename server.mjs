import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { access, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { networkInterfaces } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT) || 4173;
const host = "0.0.0.0";

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json; charset=utf-8",
};

const server = createServer(async (request, response) => {
  try {
    const requestUrl = new URL(request.url || "/", `http://${request.headers.host}`);

    if (request.method === "POST" && requestUrl.pathname === "/api/ocr") {
      await handleOcrRequest(request, response);
      return;
    }

    const pathname = decodeURIComponent(requestUrl.pathname);
    const relativePath = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
    const filePath = path.resolve(root, relativePath);

    if (!filePath.startsWith(root + path.sep)) {
      response.writeHead(403);
      response.end("Forbidden");
      return;
    }

    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) throw new Error("Not a file");
    await access(filePath);

    const content = await readFile(filePath);
    response.writeHead(200, {
      "Cache-Control": "no-store",
      "Content-Type": mimeTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream",
    });
    response.end(content);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
});

async function handleOcrRequest(request, response) {
  const tempDirectory = path.join(root, ".ocr-temp");
  const imagePath = path.join(tempDirectory, `upload-${Date.now()}.img`);
  let body;

  try {
    body = await readRequestBody(request, 12 * 1024 * 1024);
    if (!body.length) throw new Error("没有收到图片。");
    await mkdir(tempDirectory, { recursive: true });
    await writeFile(imagePath, body);
    const result = await runWindowsOcr(imagePath);
    response.writeHead(200, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    });
    response.end(JSON.stringify(result));
  } catch (error) {
    response.writeHead(422, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    });
    response.end(JSON.stringify({ error: error.message || "图片识别失败。" }));
  } finally {
    await rm(imagePath, { force: true }).catch(() => {});
  }
}

function readRequestBody(request, limit) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;

    request.on("data", (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(new Error("图片太大，请压缩到 12 MB 以内。"));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => resolve(Buffer.concat(chunks)));
    request.on("error", reject);
  });
}

function runWindowsOcr(imagePath) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(root, "ocr.ps1");
    const child = spawn(
      "powershell.exe",
      ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", scriptPath, "-ImagePath", imagePath],
      { windowsHide: true },
    );
    const output = [];
    const errors = [];

    child.stdout.on("data", (chunk) => output.push(chunk));
    child.stderr.on("data", (chunk) => errors.push(chunk));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(Buffer.concat(errors).toString("utf8").trim() || "Windows OCR 执行失败。"));
        return;
      }
      try {
        resolve(JSON.parse(Buffer.concat(output).toString("utf8").trim()));
      } catch {
        reject(new Error("OCR 返回了无法解析的结果。"));
      }
    });
  });
}

server.listen(port, host, () => {
  const addresses = Object.values(networkInterfaces())
    .flat()
    .filter((item) => item && item.family === "IPv4" && !item.internal)
    .map((item) => item.address);

  console.log("");
  console.log("词序已在运行：");
  console.log(`  电脑访问：http://localhost:${port}`);
  addresses.forEach((address) => {
    console.log(`  手机访问：http://${address}:${port}`);
  });
  console.log("");
  console.log("保持此窗口开启，按 Ctrl+C 可停止服务。");
});
