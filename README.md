# PharmaFlow (IMS)

Short README for local development, tech stack, and pushing to your own git remote.

**Tech stack**
- Backend: Python 3.x, Flask, Flask-CORS
- Frontend: React + TypeScript, Vite
- DB client: libsql-client (with optional SQLite via `USE_SQLITE` env var)
- Key backend libs: pandas, pyjwt, python-dotenv, werkzeug, requests
- Key frontend libs: react, react-dom, react-router-dom, axios, recharts, date-fns

---

**Quick setup (Windows PowerShell)**

1) Backend (Python)

```powershell
# create virtualenv
python -m venv .venv
# activate
.\.venv\Scripts\Activate.ps1
# install
pip install --upgrade pip
pip install -r backend\requirements.txt
```

Run backend (development):

```powershell
# from repo root
cd backend
# set env vars as needed (example)
$env:FLASK_APP = 'app.py'
$env:PORT = '10000'
# run
python app.py
```

2) Frontend (Node + Vite)

```powershell
cd frontend
# install deps
npm install
# dev
npm run dev
# build
npm run build
```

Open the frontend dev server URL shown by Vite (default `http://localhost:5173`).

---

**Environment variables (common)**
- `SECRET_KEY` - Flask session secret
- `PORT` - backend port (default 10000)
- `USE_SQLITE` - set to `1` to use SQLite local path if configured
- `APP_URL` - used by keep-alive service
- `CORS_ORIGINS` - allowed origins for CORS (comma-separated)

---

**Git: push this repo to your remote**

1) Create a repository on your Git hosting (GitHub/GitLab) and copy the HTTPS or SSH repo URL.

2) Add remote and push current branch (PowerShell):

```powershell
# add remote named 'origin' (replace URL)
git remote add origin https://github.com/youruser/yourrepo.git
# verify
git remote -v
# push current branch and set upstream
git branch --show-current
git push -u origin <branch>
```

If `origin` already exists and you need to replace it:

```powershell
git remote set-url origin https://github.com/youruser/yourrepo.git
```

If remote contains commits you don't have, fetch and rebase first:

```powershell
git fetch origin
git pull --rebase origin <branch>
# resolve conflicts if any, then push
git push
```

To push all branches and tags:

```powershell
git push --all origin
git push --tags
```

**Safety note:** Prefer `--force-with-lease` over `--force` if you must overwrite remote history.

---

**Keeping an upstream (original repo) reference**
If you cloned from an original repo and want to keep it as `upstream`:

```powershell
git remote add upstream https://github.com/original/therepo.git
git fetch upstream
git checkout main
git merge upstream/main   # or: git rebase upstream/main
```

---

If you want, I can:
- Add and commit this `README.md`, or
- Run the `git remote add` + `git push` commands for you if you provide the remote URL.

