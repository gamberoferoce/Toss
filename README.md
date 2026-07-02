# Toss

Phone-to-PC file transfer with a swipe-to-send gesture. Run **Toss** on your Windows PC, scan the QR code with your phone, pick a file, and swipe up.

## Download (end users)

**You do not need to clone this repository.**

1. Open **[Releases](https://github.com/gamberoferoce/Toss/releases)**
2. Download `FileSharing.zip` from the latest release
3. Extract all files to one folder
4. Double-click **Toss.exe**

The zip contains `Toss.exe`, `FileSharing.exe`, and `README.txt` (usage and troubleshooting).

## Network & privacy

Toss is meant for a **network you control** (home, studio, gallery). Anyone on the same Wi‑Fi can send files to the PC while Toss is running. There is no password — that keeps setup instant. Do not use on public or guest Wi‑Fi.

## Develop

Requirements: **Windows 10/11**, **Node.js 18+**, **.NET 8 SDK** (for the WebView2 host).

```bash
git clone https://github.com/gamberoferoce/Toss.git
cd Toss
npm install
npm start
```

- PC receiver: `http://127.0.0.1:3000/receiver/`
- Phone sender: URL shown in the server console / QR (same Wi‑Fi)

WebView2 host in dev:

```bash
# terminal 1
set FILESHARING_OPEN=0
npm start

# terminal 2
dotnet run --project host
```

Build the distribution zip:

```bash
npm run pack
```

Output: `dist/FileSharing.zip`

## Project layout

| Path | Role |
|------|------|
| `server/` | Express server, upload, WebSocket |
| `swipe/` | Phone sender UI |
| `receiver/` | PC receiver UI |
| `host/` | `Toss.exe` WebView2 shell |
| `scripts/` | Embed UI, pack zip, icon |
