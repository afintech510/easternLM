# ELM Print Server — Sunmi NT311

Local bridge between the POS browser and the Sunmi NT311 thermal printer on the LAN.

```
POS browser (this PC)
  -> ws://localhost:9111 (this print server)
    -> TCP 192.168.1.4:9100 (Sunmi NT311 on LAN)
```

Must run on the same PC where the POS browser is open (browsers only allow WebSocket to localhost over HTTPS).

## Setup on the POS desktop

### 1. Install Node.js

Download from https://nodejs.org (LTS, Windows x64 .msi). Run the installer with defaults. Close and reopen your command prompt after installing.

Verify:
```
node --version
npm --version
```

### 2. Clone the repo (first time only)

```
cd C:\Users\alark\projects
git clone https://github.com/afintech510/easternLM.git
```

If you already have the repo, just pull:
```
cd C:\Users\alark\projects\easternLM
git pull
```

### 3. Install dependencies

```
cd C:\Users\alark\projects\easternLM\tools\elm-print-server
npm install
```

### 4. Verify the printer is reachable

```
ping 192.168.1.4
```

Should get replies. If not, check that the NT311 is on and plugged into Ethernet.

### 5. Start the print server

Double-click `start.bat`, or from a command prompt:
```
cd C:\Users\alark\projects\easternLM\tools\elm-print-server
node server.js
```

You should see:
```
========================================
  ELM PRINT SERVER — Sunmi NT311
========================================
  WebSocket: ws://localhost:9111
  Counter (NT311): 192.168.1.4:9100
========================================

  Counter (NT311): ONLINE
```

### 6. Test from the POS

Open the POS in Chrome. The printer status indicator in the bottom bar should show green "NT311". Click it to send a test print.

### 7. Auto-start on boot

Press Win+R, type `shell:startup`, press Enter. Create a shortcut to:
```
C:\Users\alark\projects\easternLM\tools\elm-print-server\start.bat
```

## If the printer IP changes

Edit `start.bat` and change the IP:
```
set PRINTER_COUNTER_IP=192.168.1.NEW_IP
```

Or edit the default in `server.js` line 18.

## Troubleshooting

**"OFFLINE" on startup** — Printer is not reachable. Check Ethernet cable, try `ping 192.168.1.4`.

**"Print server offline" in POS** — The print server isn't running. Open `start.bat`.

**"NT311" shows amber in POS** — Print server is running but can't reach the printer. Check network.
