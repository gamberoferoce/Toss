const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const out = path.join(__dirname, "..", "server", "ui-html.js");

const swipe = fs.readFileSync(path.join(root, "swipe", "index.html"), "utf8");
const receiver = fs.readFileSync(path.join(root, "receiver", "index.html"), "utf8");

const body = `module.exports = ${JSON.stringify({ swipe, receiver })};\n`;
fs.writeFileSync(out, body);
console.log("Embedded UI into server/ui-html.js");
