# 🚀 Deployment Guide — GitHub + Render

Step-by-step guide to push the **Brealls Resorts** booking system to
**GitHub** and deploy it for free on **Render**.

---

## Part 1 — Push your code to GitHub

### 1.1 Install Git (if you don't have it)

- **Windows**: download from <https://git-scm.com/download/win> → install with defaults
- **Mac**: `brew install git` or install Xcode CLI tools
- Verify:
  ```bash
  git --version
  ```

### 1.2 Create a GitHub account & repo

1. Sign up at <https://github.com> (free).
2. Click the **➕** at the top right → **New repository**.
3. Fill in:
   - **Repository name**: `brealls-resorts`
   - **Description**: *Resort booking system for Brealls Resorts*
   - Visibility: **Public** (required for Render free tier) or **Private**
   - ❌ **Do NOT** check "Add a README" / ".gitignore" / "license" — we already have files
4. Click **Create repository**.
5. Copy the URL shown (looks like `https://github.com/yourname/brealls-resorts.git`).

### 1.3 Add a `.gitignore` (so we don't commit junk)

Make sure your project root has a `.gitignore` file — if not, create one with this content:

```
node_modules
dist
.env
.env.local
.DS_Store
*.log
.vite
```

> ✅ A `.gitignore` was already added to this project for you.

### 1.4 Push your project

Open a terminal **inside the project folder** and run:

```bash
# Initialize the repo
git init
git branch -M main

# Stage and commit everything
git add .
git commit -m "Initial commit: Brealls Resorts booking system"

# Link to your GitHub repo (use YOUR url)
git remote add origin https://github.com/yourname/brealls-resorts.git

# Push to GitHub
git push -u origin main
```

When prompted for credentials:
- **Username** → your GitHub username
- **Password** → use a **Personal Access Token** (NOT your password)
  - Generate one: GitHub → **Settings → Developer settings → Personal access tokens → Tokens (classic) → Generate new token**
  - Tick the `repo` scope → generate → **copy it once**, then paste it as the password

> 💡 Easier alternative: install **GitHub Desktop** (<https://desktop.github.com>), then *File → Add local repository* → *Publish to GitHub*. No git commands needed.

### 1.5 Updating later

After any code change:

```bash
git add .
git commit -m "Describe what changed"
git push
```

Render (set up below) will auto-redeploy every time you push.

---

## Part 2 — Deploy to Render

The app is a **Vite static site** that builds to `dist/index.html` (everything inlined into one file by `vite-plugin-singlefile`). Render's **Static Site** plan is free and perfect for this.

### 2.1 Create a Render account

1. Go to <https://render.com> → **Get Started For Free**.
2. Sign up with your **GitHub** account (easiest — auto-links your repos).
3. Authorize Render to read your repositories.

### 2.2 Create a new Static Site

1. On the Render dashboard, click **➕ Add new → Static Site**.
2. Find your `brealls-resorts` repo in the list → click **Connect**.
   - If you don't see it: click *Configure GitHub App* → grant access to the repo.
3. Fill in:

   | Field | Value |
   |---|---|
   | **Name** | `brealls-resorts` (this becomes your URL) |
   | **Branch** | `main` |
   | **Root Directory** | *(leave blank)* |
   | **Build Command** | `npm install && npm run build` |
   | **Publish Directory** | `dist` |

4. **Instance Type** → `Free`.
5. Click **Create Static Site**.

### 2.3 Wait for the first build

Render will:
1. Pull your repo
2. Run `npm install`
3. Run `npm run build`
4. Publish the contents of `dist/`

Logs stream live. After ~1–2 minutes you'll see:

```
✓ built in 1.4s
Upload complete!
Your site is live 🎉
```

Your site URL will be shown at the top, e.g.:
```
https://brealls-resorts.onrender.com
```

Open it — **the booking system is now live on the internet** ✅.

### 2.4 Add a Single Page App rewrite (recommended)

The current app uses a single `index.html` (one-page React SPA), so this is
usually fine — but to be safe and support future routes:

1. In the Render dashboard, open your Static Site.
2. Go to **Redirects/Rewrites** tab.
3. Add a rule:

   | Source | Destination | Action |
   |---|---|---|
   | `/*` | `/index.html` | `Rewrite` |

4. Click **Save Changes**.

This makes sure refreshing any URL still loads the app.

### 2.5 Auto-deploy on every push

Render is already set up to **auto-deploy** every time you `git push` to `main`. You can watch builds under the **Events** tab.

To turn it off (e.g. you want manual deploys): **Settings → Auto-Deploy → No**.

---

## Part 3 — Custom domain (optional)

1. Buy a domain from any registrar (Namecheap, GoDaddy, etc.).
2. In Render: open the site → **Settings → Custom Domains → Add Custom Domain**.
3. Enter your domain (e.g. `brealls.com`).
4. Render shows DNS records you must add at your registrar:
   - `A` record → Render's IP
   - or `CNAME` record → `brealls-resorts.onrender.com`
5. Wait 5–60 minutes for DNS to propagate. Render auto-issues a free **Let's Encrypt SSL** certificate.

---

## Part 4 — Connecting to a backend (when you add MySQL)

The current build is purely client-side using `localStorage`. When you build the API (see `database/README.md`) you'll have two services:

| Service | Hosted on | What it does |
|---|---|---|
| **Frontend** | Render Static Site | The React app (already deployed above) |
| **Backend API** | Render Web Service | Node/Express/PHP/Python that talks to Aiven MySQL |
| **Database** | Aiven MySQL | Stores users, rooms, bookings |

### Deploy a Node.js backend on Render

1. Put your Express/Next.js API in a separate folder (or repo).
2. On Render: **➕ Add new → Web Service** → connect the same repo.
3. Settings:
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js` (or whatever your entry file is)
   - **Instance Type**: `Free`
4. Under **Environment**, add the Aiven credentials:
   ```
   DB_HOST=mysql-xxxxxxx-xxxx.aivencloud.com
   DB_PORT=12345
   DB_USER=avnadmin
   DB_PASSWORD=...
   DB_NAME=brealls_resorts
   ```
5. For the SSL `ca.pem`, either:
   - Add as a **Secret File** (Settings → Secret Files → upload `ca.pem`), then read `/etc/secrets/ca.pem` in your code, **or**
   - Paste its contents into an env var `DB_SSL_CA` and parse it in code.
6. Deploy. Your API URL will be `https://brealls-api.onrender.com`.

### Point the frontend at the API

Add to your Render **Static Site → Environment**:
```
VITE_API_URL=https://brealls-api.onrender.com
```

Then in `src/store.ts` use `import.meta.env.VITE_API_URL` for fetch calls.
Trigger a manual redeploy after adding env vars.

### CORS

In your Node API enable CORS for your Render domain:
```js
import cors from "cors";
app.use(cors({ origin: "https://brealls-resorts.onrender.com" }));
```

---

## Part 5 — Troubleshooting

| Problem | Fix |
|---|---|
| `git push` rejected — "fetch first" | Run `git pull --rebase origin main` then `git push` |
| Render build fails: *"vite: not found"* | Make sure `vite` is in `devDependencies` (it already is). Don't set `NODE_ENV=production` |
| Site shows blank page | Open browser DevTools → Console. Usually a Vite base-path issue. Confirm Publish Directory is `dist` |
| 404 on refresh | Add the `/* → /index.html` rewrite rule (Part 2.4) |
| Free service "spun down" / slow first load | Render's free Web Service sleeps after 15 min idle. Static Sites do **not** sleep — only the API does. Upgrade to Starter ($7/mo) to keep API always-on |
| GitHub asks for password every push | Switch to SSH or use **GitHub CLI**: `gh auth login` |
| Render not picking up new commits | Check **Settings → Auto-Deploy = Yes**, or click **Manual Deploy → Deploy latest commit** |

---

## ✅ Quick Recap

1. `git init` → `git add .` → `git commit` → `git push` to GitHub
2. Render → Static Site → connect repo
3. Build Command: `npm install && npm run build`
4. Publish Directory: `dist`
5. Click **Create Static Site** → live in ~2 minutes 🚀
6. Every future `git push` auto-redeploys

Your live URL will look like:
```
https://brealls-resorts.onrender.com
```

Share that link with anyone! 🌴
