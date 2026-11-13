import { createServer as createHttpServer } from "node:http";
import { appendFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const backendDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.resolve(backendDirectory, "..");
const defaultFrontendDirectory = path.join(projectDirectory, "frontend");
const defaultDataDirectory = path.join(backendDirectory, "data");
const maximumRequestBytes = 16 * 1024;
const allowedEvents = new Set([
  "Wedding",
  "Funeral",
  "Church event",
  "Community event",
  "Corporate function",
  "Other",
]);
const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

function sendJson(response, status, payload) {
  response.writeHead(status, {
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(payload));
}

async function readJsonBody(request) {
  let bytes = 0;
  const chunks = [];
  for await (const chunk of request) {
    bytes += chunk.length;
    if (bytes > maximumRequestBytes) {
      const error = new Error("Request body is too large.");
      error.statusCode = 413;
      throw error;
    }
    chunks.push(chunk);
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    const error = new Error("Send a valid JSON request.");
    error.statusCode = 400;
    throw error;
  }
}

function validateQuote(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return "Send a valid quote request.";
  }

  if (typeof data.name !== "string" || data.name.trim().length < 2 || data.name.trim().length > 100) {
    return "Please enter your name (2–100 characters).";
  }
  if (typeof data.phone !== "string" || !/^[+()\d\s-]{7,24}$/.test(data.phone.trim())) {
    return "Please enter a valid phone number.";
  }
  if (typeof data.event !== "string" || !allowedEvents.has(data.event)) {
    return "Please choose one of the listed event types.";
  }
  if (data.date !== undefined && data.date !== "") {
    if (typeof data.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
      return "Please enter a valid event date.";
    }
    const date = new Date(`${data.date}T00:00:00.000Z`);
    if (Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== data.date) {
      return "Please enter a valid event date.";
    }
  }
  if (data.message !== undefined && (typeof data.message !== "string" || data.message.length > 1500)) {
    return "Your message must be 1,500 characters or fewer.";
  }
  return null;
}

async function serveFrontend(request, response, pathname, frontendDirectory) {
  let relativePath;
  try {
    relativePath = decodeURIComponent(pathname).replace(/^\/+/, "");
  } catch {
    sendJson(response, 400, { error: "Invalid URL." });
    return;
  }

  if (!relativePath || relativePath.endsWith("/")) relativePath += "index.html";
  const filePath = path.resolve(frontendDirectory, relativePath);
  if (filePath !== frontendDirectory && !filePath.startsWith(`${frontendDirectory}${path.sep}`)) {
    sendJson(response, 403, { error: "Access denied." });
    return;
  }

  try {
    const contents = await readFile(filePath);
    response.writeHead(200, {
      "Cache-Control": "no-cache",
      "Content-Length": contents.length,
      "Content-Type": mimeTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream",
      "X-Content-Type-Options": "nosniff",
    });
    response.end(request.method === "HEAD" ? undefined : contents);
  } catch (error) {
    if (error.code === "ENOENT" || error.code === "EISDIR") {
      sendJson(response, 404, { error: "Not found." });
      return;
    }
    throw error;
  }
}

export function createServer({ frontendDirectory = defaultFrontendDirectory, dataDirectory = defaultDataDirectory } = {}) {
  const quoteFile = path.join(dataDirectory, "quotes.jsonl");
  let writes = Promise.resolve();

  return createHttpServer(async (request, response) => {
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

    let pathname;
    try {
      pathname = new URL(request.url, "http://localhost").pathname;
    } catch {
      sendJson(response, 400, { error: "Invalid URL." });
      return;
    }

    if (pathname === "/api/health" && (request.method === "GET" || request.method === "HEAD")) {
      sendJson(response, 200, { status: "ok" });
      return;
    }

    if (pathname === "/api/quotes") {
      if (request.method !== "POST") {
        response.setHeader("Allow", "POST");
        sendJson(response, 405, { error: "Method not allowed." });
        return;
      }

      let data;
      try {
        data = await readJsonBody(request);
      } catch (error) {
        sendJson(response, error.statusCode || 400, { error: error.message });
        return;
      }

      const validationError = validateQuote(data);
      if (validationError) {
        sendJson(response, 400, { error: validationError });
        return;
      }

      const quote = {
        name: data.name.trim(),
        phone: data.phone.trim(),
        event: data.event,
        date: data.date || null,
        message: (data.message || "").trim(),
        receivedAt: new Date().toISOString(),
      };

      const write = writes.then(async () => {
        await mkdir(dataDirectory, { recursive: true });
        await appendFile(quoteFile, `${JSON.stringify(quote)}\n`, { encoding: "utf8", mode: 0o600 });
      });
      writes = write.catch(() => {});

      try {
        await write;
      } catch (error) {
        console.error("Could not save quote request:", error.message);
        sendJson(response, 500, { error: "We couldn't save your request. Please try again." });
        return;
      }

      sendJson(response, 201, { message: "Thanks for getting in touch. Your quote request has been received." });
      return;
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      response.setHeader("Allow", "GET, HEAD");
      sendJson(response, 405, { error: "Method not allowed." });
      return;
    }

    try {
      await serveFrontend(request, response, pathname, frontendDirectory);
    } catch (error) {
      console.error("Could not serve website file:", error.message);
      if (!response.headersSent) sendJson(response, 500, { error: "The website could not load." });
      else response.destroy(error);
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const port = Number(process.env.PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    console.error("PORT must be a whole number between 1 and 65535.");
    process.exitCode = 1;
  } else {
    const server = createServer();
    server.listen(port, "0.0.0.0", () => {
      console.log(`Cabal Privy website listening on http://localhost:${port}`);
    });
    server.on("error", (error) => {
      console.error("Could not start Cabal Privy website:", error.message);
      process.exitCode = 1;
    });
  }
}
