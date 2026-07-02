const express = require("express");
const fs = require("fs");
const http = require("http");
const os = require("os");
const path = require("path");
const readline = require("readline");
const { exec, execFile } = require("child_process");
const multer = require("multer");
const QRCode = require("qrcode");
const WebSocket = require("ws");

// ponytail: TOSS_* aliases for dev; host still sets FILESHARING_* internally
if (process.env.TOSS_OPEN != null) process.env.FILESHARING_OPEN = process.env.TOSS_OPEN;
if (process.env.TOSS_SERVER_ONLY != null) {
  process.env.FILESHARING_SERVER_ONLY = process.env.TOSS_SERVER_ONLY;
}

const DATA_ROOT = process.pkg
  ? path.join(process.env.APPDATA || path.dirname(process.execPath), "Toss")
  : path.join(__dirname, "..");
const INCOMING_DIR = path.join(DATA_ROOT, "incoming");
const LOG_FILE = path.join(DATA_ROOT, "toss.log");
const PORT_FILE = path.join(DATA_ROOT, "port.txt");
const PID_FILE = path.join(DATA_ROOT, "server.pid");
const VERSION = (() => {
  try {
    return require(path.join(__dirname, "..", "package.json")).version;
  } catch {
    return "1.0.0";
  }
})();
const PORTS = [Number(process.env.PORT) || 3000, 3001, 3002, 3003].filter(
  (p, i, a) => a.indexOf(p) === i
);
const SKIP_IFACE = /tailscale|vmware|virtualbox|vethernet|hyper-v|wsl|loopback|npcap|tap-|zerotier|hamachi|bluetooth/i;

let activePort = PORTS[0];
let lanReachable = null;
let firewallHint = "";
let wss;
let broadcast = () => {};

fs.mkdirSync(INCOMING_DIR, { recursive: true });

function logLine(text) {
  const line = `[${new Date().toISOString()}] ${text}`;
  try {
    fs.appendFileSync(LOG_FILE, line + "\n");
  } catch {
    /* ignore */
  }
}

function waitExit(code, message) {
  if (message) {
    console.error(message);
    logLine(message);
  }
  if (process.pkg && process.platform === "win32") {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question("\nPress Enter to close... ", () => {
      rl.close();
      process.exit(code);
    });
    return;
  }
  process.exit(code);
}

let ui;
try {
  ui = require("./ui-html");
} catch (err) {
  waitExit(1, "UI bundle missing — rebuild or re-download Toss.\n" + err.message);
}

function listLanIps() {
  const nets = os.networkInterfaces();
  const scored = [];
  const seen = new Set();
  for (const [name, addrs] of Object.entries(nets)) {
    if (SKIP_IFACE.test(name)) continue;
    for (const net of addrs || []) {
      if (net.family !== "IPv4" && net.family !== 4) continue;
      if (net.internal) continue;
      const ip = net.address;
      if (ip.startsWith("169.254.") || seen.has(ip)) continue;
      seen.add(ip);

      let score = 0;
      if (/wi-?fi|wlan|wireless/i.test(name)) score += 40;
      if (/ethernet/i.test(name) && !/virtual/i.test(name)) score += 35;
      if (ip.startsWith("192.168.")) score += 15;
      if (ip.startsWith("10.")) score += 12;
      const p = ip.split(".");
      if (p[0] === "172" && Number(p[1]) >= 16 && Number(p[1]) <= 31) score += 12;

      scored.push({
        ip,
        name,
        score,
        url: `http://${ip}:${activePort}/`,
      });
    }
  }
  scored.sort((a, b) => b.score - a.score);
  return scored;
}

function getLanIp() {
  return listLanIps()[0]?.ip || "127.0.0.1";
}

function probeLanReachable(ip, port) {
  return new Promise((resolve) => {
    if (!ip || ip === "127.0.0.1") {
      resolve(false);
      return;
    }
    const req = http.get(`http://${ip}:${port}/api/ping`, (res) => {
      res.resume();
      resolve(res.statusCode === 200);
    });
    req.on("error", () => resolve(false));
    req.setTimeout(3000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

function tryFirewallRules() {
  return new Promise((resolve) => {
    if (process.platform !== "win32") {
      resolve(false);
      return;
    }
    const exe = process.execPath.replace(/"/g, '\\"');
    const cmds = [
      `netsh advfirewall firewall delete rule name="Toss Server"`,
      `netsh advfirewall firewall add rule name="Toss Server" dir=in action=allow program="${exe}" enable=yes profile=any`,
    ];
    for (const p of PORTS) {
      cmds.push(`netsh advfirewall firewall delete rule name="Toss TCP ${p}"`);
      cmds.push(
        `netsh advfirewall firewall add rule name="Toss TCP ${p}" dir=in action=allow protocol=TCP localport=${p} enable=yes profile=any`
      );
    }
    let failed = 0;
    let done = 0;
    for (const cmd of cmds) {
      exec(cmd, (err) => {
        done += 1;
        if (err) failed += 1;
        if (done !== cmds.length) return;
        if (failed) {
          firewallHint = "Allow Toss through Windows Firewall (see README.txt).";
        } else {
          firewallHint = "";
        }
        resolve(failed > 0);
      });
    }
  });
}

function safeName(name) {
  return path.basename(name).replace(/[^\w.\-()+ ]/g, "_") || "file";
}

function openBrowser(url) {
  setTimeout(() => {
    if (process.platform === "win32") {
      exec(`start "" "${url}"`, (err) => {
        if (err) console.log("  Could not open browser — paste the PC link above manually.");
      });
      return;
    }
    if (process.platform === "darwin") {
      exec(`open "${url}"`);
      return;
    }
    exec(`xdg-open "${url}"`);
  }, 600);
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, INCOMING_DIR),
  filename: (_req, file, cb) => {
    cb(null, `${Date.now()}-${safeName(file.originalname)}`);
  },
});

const upload = multer({ storage, limits: { fileSize: 512 * 1024 * 1024 } });
const app = express();

app.get("/api/ping", (_req, res) => res.json({ ok: true, port: activePort, version: VERSION }));

app.get("/api/info", (_req, res) => {
  const all = listLanIps();
  const ip = all[0]?.ip || "127.0.0.1";
  res.json({
    ip,
    port: activePort,
    phoneUrl: `http://${ip}:${activePort}/`,
    receiverUrl: `http://127.0.0.1:${activePort}/receiver/`,
    allUrls: all,
    warnLocalhost: ip === "127.0.0.1",
    lanReachable,
    firewallHint,
    pcCannotOpenPhoneUrl: ip !== "127.0.0.1",
  });
});

app.get("/api/qr.svg", async (req, res) => {
  const target = String(req.query.url || "");
  if (!target.startsWith("http://") && !target.startsWith("https://")) {
    res.status(400).end();
    return;
  }
  try {
    const svg = await QRCode.toString(target, {
      type: "svg",
      margin: 1,
      width: 180,
      color: { dark: "#e2e8f0", light: "#00000000" },
    });
    res.type("image/svg+xml").send(svg);
  } catch (err) {
    console.error("qr:", err.message);
    res.status(500).end();
  }
});

app.post("/api/upload", upload.single("file"), (req, res) => {
  if (!req.file) {
    res.status(400).json({ ok: false, error: "no file" });
    return;
  }
  console.log(`Received: ${req.file.filename} (${req.file.size} bytes)`);
  logLine(`Received ${req.file.originalname} (${req.file.size} bytes)`);
  const payload = {
    type: "received",
    name: req.file.originalname,
    savedAs: req.file.filename,
    size: req.file.size,
  };
  broadcast(payload);
  res.json({ ok: true, ...payload });
});

app.post("/api/open-incoming", (_req, res) => {
  if (process.platform === "win32") {
    execFile("explorer.exe", [INCOMING_DIR], () => {
      res.json({ ok: true, path: INCOMING_DIR });
    });
    return;
  }
  const opener = process.platform === "darwin" ? "open" : "xdg-open";
  execFile(opener, [INCOMING_DIR], (err) => {
    if (err) {
      res.status(500).json({ ok: false });
      return;
    }
    res.json({ ok: true, path: INCOMING_DIR });
  });
});

function readUiRoute(page) {
  return (_req, res) => res.type("html").send(ui[page]);
}

app.get("/receiver/", readUiRoute("receiver"));
app.get("/receiver", (_req, res) => res.redirect("/receiver/"));
app.get("/", readUiRoute("swipe"));

function attachWs(server) {
  wss = new WebSocket.Server({ server });
  broadcast = (data, except) => {
    const text = JSON.stringify(data);
    for (const client of wss.clients) {
      if (client !== except && client.readyState === WebSocket.OPEN) {
        client.send(text);
      }
    }
  };
  wss.on("connection", (ws) => {
    ws.on("message", (raw) => {
      let msg;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return;
      }
      if (msg.type === "launch") {
        broadcast({ type: "launch", name: msg.name || "file", size: msg.size || 0 }, ws);
      } else if (msg.type === "phone-online") {
        broadcast({ type: "phone-online" }, ws);
      }
    });
  });
}

async function onReady() {
  const all = listLanIps();
  const ip = getLanIp();
  const phoneUrl = `http://${ip}:${activePort}/`;
  const receiverUrl = `http://127.0.0.1:${activePort}/receiver/`;

  const firewallFailed = await tryFirewallRules();
  if (firewallFailed) {
    console.log("  Firewall: could not add rules automatically.");
    console.log("  Run as Administrator once, or allow in Windows Firewall (see README.txt).");
  } else {
    console.log(`  Firewall: allowed Toss on TCP ports ${PORTS.join(", ")}.`);
  }
  await new Promise((r) => setTimeout(r, 400));
  if (ip !== "127.0.0.1") {
    lanReachable = await probeLanReachable(ip, activePort);
  } else {
    lanReachable = false;
  }

  console.log("");
  console.log("  Toss is running");
  console.log("  ----------------------");
  console.log("  ON THIS PC, open in your browser:");
  console.log(`    ${receiverUrl}`);
  console.log("");
  console.log("  ON YOUR PHONE (same Wi-Fi), open:");
  console.log(`    ${phoneUrl}`);
  console.log("");
  console.log(`  Files saved to  ${INCOMING_DIR}`);
  console.log(`  Log file        ${LOG_FILE}`);
  if (all.length) {
    console.log("  Detected IPs:");
    for (const row of all) {
      console.log(`    - ${row.ip} (${row.name})`);
    }
  }
  if (ip === "127.0.0.1") {
    console.log("  WARNING: no LAN IP — phone cannot connect until PC has Wi-Fi/Ethernet.");
  } else if (!lanReachable) {
    console.log("  WARNING: phone URL blocked by Windows Firewall (common).");
    console.log("  Fix: allow Toss through Windows Firewall (see README.txt).");
    console.log("  Note: opening the phone URL on this PC may also fail — test from the phone.");
  } else {
    console.log("  Network check: phone URL reachable on this PC.");
  }
  console.log("");
  console.log("  Keep this window open. Close it to stop.");
  console.log("");

  logLine(
    `Running on port ${activePort}, phone ${phoneUrl}, pc ${receiverUrl}, lanReachable=${lanReachable}`
  );

  try {
    fs.writeFileSync(PORT_FILE, String(activePort));
    fs.writeFileSync(PID_FILE, String(process.pid));
  } catch {
    /* ignore */
  }

  if (process.env.FILESHARING_OPEN === "1") {
    openBrowser(receiverUrl);
  }
}

function tryListen(portIndex) {
  if (portIndex >= PORTS.length) {
    waitExit(1, "No free port (tried " + PORTS.join(", ") + "). Close other apps using these ports.");
    return;
  }

  activePort = PORTS[portIndex];
  const server = http.createServer(app);
  attachWs(server);

  server.once("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.log(`Port ${activePort} is busy, trying next...`);
      server.close();
      tryListen(portIndex + 1);
      return;
    }
    waitExit(1, "Server error: " + err.message);
  });

  server.listen(activePort, "0.0.0.0", () => onReady());
}

function cleanupRuntimeFiles() {
  for (const file of [PORT_FILE, PID_FILE]) {
    try {
      fs.unlinkSync(file);
    } catch {
      /* ignore */
    }
  }
}

if (process.pkg && process.env.FILESHARING_OPEN == null && process.env.FILESHARING_SERVER_ONLY !== "1") {
  process.env.FILESHARING_OPEN = "1";
}

process.on("uncaughtException", (err) => {
  waitExit(1, "Fatal error: " + err.message);
});

process.on("SIGINT", () => {
  cleanupRuntimeFiles();
  process.exit(0);
});

process.on("SIGTERM", () => {
  cleanupRuntimeFiles();
  process.exit(0);
});

tryListen(0);
