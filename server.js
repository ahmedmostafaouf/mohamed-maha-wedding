const http = require("http");
const fs = require("fs");
const path = require("path");
const { randomUUID } = require("crypto");

const ROOT = __dirname;
const DATA_FILE = path.join(ROOT, "data", "rsvp.json");
const PORT = Number(process.env.PORT) || 8765;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".mp4": "video/mp4",
  ".webm": "audio/webm",
  ".mp3": "audio/mpeg",
  ".ico": "image/x-icon",
};

function ensureDataFile() {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, "[]\n", "utf8");
}

function readRsvp() {
  ensureDataFile();
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf8").trim() || "[]";
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function writeRsvp(rows) {
  ensureDataFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(rows, null, 2) + "\n", "utf8");
}

function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(payload);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (c) => {
      size += c.length;
      if (size > 1e6) {
        reject(new Error("body too large"));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function safeJoin(urlPath) {
  const decoded = decodeURIComponent((urlPath || "/").split("?")[0]);
  const rel = decoded === "/" ? "/index.html" : decoded;
  const full = path.normalize(path.join(ROOT, rel));
  if (!full.startsWith(ROOT)) return null;
  return full;
}

async function handleApi(req, res, pathname) {
  if (pathname === "/api/rsvp" && req.method === "GET") {
    const rows = readRsvp().slice().reverse();
    return sendJson(res, 200, { ok: true, rows });
  }

  if (pathname === "/api/rsvp" && req.method === "POST") {
    let body;
    try {
      body = JSON.parse(await readBody(req));
    } catch {
      return sendJson(res, 400, { error: "بيانات غير صالحة" });
    }

    const guest_name = String(body.guest_name || "").trim().slice(0, 80);
    const message = String(body.message || "").trim().slice(0, 300);
    const attending = ["yes", "no", "maybe"].includes(body.attending)
      ? body.attending
      : "yes";
    let guests = Number(body.guests);
    if (!Number.isFinite(guests) || guests < 0) guests = 1;
    guests = Math.min(50, Math.floor(guests));

    if (!guest_name) {
      return sendJson(res, 400, { error: "الاسم مطلوب" });
    }

    const row = {
      id: randomUUID(),
      guest_name,
      attending,
      guests,
      message,
      created_at: new Date().toISOString(),
    };

    const rows = readRsvp();
    rows.push(row);
    writeRsvp(rows);

    return sendJson(res, 200, { ok: true, row });
  }

  return sendJson(res, 404, { error: "not found" });
}

function serveStatic(req, res, filePath) {
  fs.stat(filePath, (err, st) => {
    if (err || !st.isFile()) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      "Content-Type": MIME[ext] || "application/octet-stream",
      "Content-Length": st.size,
    });
    fs.createReadStream(filePath).pipe(res);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  const pathname = url.pathname;

  try {
    if (pathname.startsWith("/api/")) {
      await handleApi(req, res, pathname);
      return;
    }

    const filePath = safeJoin(pathname);
    if (!filePath) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }
    serveStatic(req, res, filePath);
  } catch (e) {
    console.error(e);
    sendJson(res, 500, { error: "خطأ في السيرفر" });
  }
});

ensureDataFile();
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Invitation server: http://127.0.0.1:${PORT}`);
  console.log(`RSVP JSON file: ${DATA_FILE}`);
});
