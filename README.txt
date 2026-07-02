TOSS — Quick start
==================

REQUIREMENTS
  • Windows 10/11
  • PC and phone on the same Wi-Fi network
  • WebView2 runtime (included with Microsoft Edge on most PCs)

FILES IN THIS FOLDER
  • Toss.exe         — double-click this to start
  • FileSharing.exe  — server (started automatically by Toss; keep in same folder)

GETTING STARTED
  1. Extract both .exe files to the same folder
  2. Double-click Toss.exe
  3. The receiver opens in its own window
  4. Closing Toss stops everything

FROM YOUR PHONE
  1. Scan the QR code on the PC
  2. Tap "Choose file"
  3. Hold the circle, charge the ring, swipe up to send

WHERE FILES GO
  %APPDATA%\FileSharing\incoming
  Use "Show in Explorer" on the PC receiver page.

NETWORK & PRIVACY (read this)
  Toss is built for a network you control (home, studio, gallery setup).
  Anyone on the same Wi-Fi can send files to this PC while Toss is running.
  There is no password — that keeps setup instant.
  Do not use on public or guest Wi-Fi. Stop Toss when you are done.

TROUBLESHOOTING
  • Phone won't connect
      - Phone on same Wi-Fi (not mobile data)
      - Do not open the phone URL on the PC — use the phone
      - Windows Firewall may block the connection. Allow Toss.exe and
        FileSharing.exe on private networks, or run once as Administrator:
        netsh advfirewall firewall add rule name="Toss" dir=in action=allow program="FULL_PATH\Toss.exe" enable=yes profile=any
        netsh advfirewall firewall add rule name="FileSharing" dir=in action=allow program="FULL_PATH\FileSharing.exe" enable=yes profile=any
  • Windows blocks the exe → "More info" → "Run anyway"
  • Toss won't open → install Microsoft Edge / WebView2 runtime

TO STOP
  Close the Toss window.
