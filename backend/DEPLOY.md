# 🖥️ RDP deploy guide — Study Dost AI backend

> By **Sami Ahraf Nirob**

Everything in this folder belongs on your Windows RDP. Copy the whole folder
across (RDP file-paste, OneDrive sync, GitHub clone — your choice), then run
the two batch files.

```
rdp/
├── main.py
├── utils.py
├── prompts.py
├── requirements.txt
├── .env.example
├── install.bat        ← run ONCE
├── start.bat          ← run every time you want to launch
└── DEPLOY.md          (this file)
```

---

## 🚀 First-time setup (~2 minutes)

### 1. Install Python 3.10+

Download from <https://www.python.org/downloads/windows/> and **tick "Add
Python to PATH"** during install.

Verify in PowerShell:

```powershell
python --version
```

### 2. Run the installer

Double-click `install.bat`. It will:
- Create a `.venv/` virtual env
- Install FastAPI, Uvicorn, OpenAI SDK, etc.
- Copy `.env.example` → `.env` if missing

### 3. Add your API key(s)

Open `.env` in Notepad and paste your Featherless key:

```env
FEATHERLESS_API_KEY=rc_your_primary_key_here
FEATHERLESS_API_KEY_BACKUP=rc_your_backup_key_here   # optional but recommended
ALLOWED_ORIGINS=https://samiahrafnirob.com
APP_API_KEY=                                         # leave empty for now
HOST=0.0.0.0
PORT=8000
```

⚠️ **Lock CORS in production.** Change `ALLOWED_ORIGINS` to your actual domain
once the frontend is live. Use `*` only while testing.

### 4. Launch the server

Double-click `start.bat`. You should see:

```
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
```

Test it locally on the RDP:

```powershell
curl http://localhost:8000/healthz
```

Should return `{"ok":true,"service":"study-dost-ai"}`.

---

## 🌐 Make it reachable from the internet (HTTPS)

The frontend on InfinityFree uses HTTPS, so **the backend must too** or the
browser will block every request.

### Option A — Cloudflare Tunnel (FREE, easiest, no port-forwarding)

Install on the RDP:

```powershell
winget install --id Cloudflare.cloudflared
```

Quick tunnel (random URL, regenerated on each restart):

```powershell
cloudflared tunnel --url http://localhost:8000
```

It prints something like `https://amber-mountain-9842.trycloudflare.com` —
paste that into `infinityfree/config.js` as `API_BASE`.

For a **stable URL** with your own subdomain, see
<https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/>:

```powershell
cloudflared tunnel login
cloudflared tunnel create study-dost
cloudflared tunnel route dns study-dost api.samiahrafnirob.com
cloudflared tunnel run study-dost
```

Then put `https://api.samiahrafnirob.com` in `config.js`.

### Option B — Caddy reverse proxy (your domain → RDP)

If you have a domain pointed at the RDP's public IP and ports 80/443 open in
the Windows firewall:

1. Install Caddy: <https://caddyserver.com/download>
2. Create `Caddyfile` next to `caddy.exe`:

   ```
   api.samiahrafnirob.com {
       reverse_proxy localhost:8000
   }
   ```

3. Run `caddy run` — it auto-fetches a Let's Encrypt cert.

### Option C — ngrok (quick & dirty)

```powershell
ngrok http 8000
```

Free tier gives a random URL per session. Fine for demos.

---

## 🔁 Run as a Windows service (auto-start with NSSM)

So the backend keeps running after you log out of the RDP:

1. Download NSSM: <https://nssm.cc/download>
2. Open an **admin** PowerShell:

   ```powershell
   nssm install StudyDostAI
   ```

3. In the GUI:
   - **Path**: `C:\path\to\rdp\.venv\Scripts\python.exe`
   - **Startup directory**: `C:\path\to\rdp`
   - **Arguments**: `main.py`
4. Click **Install service**.
5. Start it:

   ```powershell
   nssm start StudyDostAI
   ```

Check it's running:

```powershell
Get-Service StudyDostAI
curl http://localhost:8000/healthz
```

To remove later: `nssm remove StudyDostAI confirm`.

---

## 🔐 Optional: gate the backend with a shared secret

In `.env`:

```env
APP_API_KEY=some-long-random-string
```

Then put the same value in `infinityfree/config.js`:

```js
API_KEY: "some-long-random-string"
```

The frontend will send it as `X-API-Key` and the backend will reject any
request without it (401).

---

## 🐛 Troubleshooting

**`install.bat` says Python not on PATH**
→ Reinstall Python and tick "Add Python to PATH".

**`pip install` fails with SSL errors**
→ Your RDP's clock might be wrong. Sync time with `w32tm /resync`.

**Frontend gets CORS error**
→ Add the frontend's full origin to `ALLOWED_ORIGINS` in `.env`, restart.

**`401 Unauthorized` from Featherless**
→ Your primary key is dead. The backend already auto-fails-over to
   `FEATHERLESS_API_KEY_BACKUP` if set. Check the console logs:
   `[utils] key #1 auth failed; trying next key`.

**Port 8000 already in use**
→ `Get-NetTCPConnection -LocalPort 8000` shows what's using it.
   Change `PORT=8001` in `.env` if needed.

**Nothing happens when I close the RDP**
→ Use NSSM (above) so the backend runs as a service even when you log out.
