# DOCKER.md — Optional Phase 8: one-command local run for judges

This is a SEPARATE Claude Code task with split timing:

- The **`dev` compose service** is just config (no Dockerfile needed) — it may be
  added any time after Phase 0 if the team wants a uniform clone-and-test
  environment during the day.
- The **`app` production-style image** (Dockerfile + next.config change) stays
  post-freeze: only after Phases 0–7 are done and both submissions are in.

It must not touch application code except the one next.config change below.

## Purpose and non-purpose

PURPOSE — two distinct uses, two compose services:

1. **Team test loop (`dev` service):** a teammate clones, runs one command, gets
   the app with hot reload, makes small changes, sees them live. No Node version
   drift, no "works on my machine".
2. **Clean-run verification (`app` service):** prove a fresh clone builds and
   runs from scratch — useful at the 14:00 checkpoint and as a judge-reproduction
   path. Production stays on Vercel + Upstash regardless; these containers never
   deploy anywhere.

```bash
git clone <repo> && cd <repo>
cp .env.example .env.local        # fill GEMINI_API_KEY (others optional)

docker compose --profile dev up   # team use: hot reload, edit files normally
# or
docker compose --profile prod up --build   # clean-build verification
# open http://localhost:3000
```

Honest note for the team: if you already have Node 20 installed, `npm install &&
npm run dev` is a strictly faster loop than the dev container. The container's
value is uniformity across the three laptops, not speed.

NON-PURPOSE — read carefully:
- There is NO database container. This app has no database server. Local
  persistence is a JSON file (`STORAGE_BACKEND=file`); production uses Upstash
  Redis (a cloud API, not a container). Do NOT add postgres, mysql, mariadb,
  mongo, or a local redis service. If you believe one is needed, stop and ask.
- Do NOT convert the dev workflow to Docker. `npm run dev` remains the primary
  way the team works. Docker is a reproduction path for judges only.
- Do NOT add Kubernetes manifests, helm charts, CI pipelines, or multi-arch
  build tooling.

## Deliverables (exactly four files + one config change)

### 1. next.config.(js|mjs|ts) — add standalone output

```js
const nextConfig = { output: "standalone" };
```

Merge with whatever already exists; change nothing else in the config.

### 2. Dockerfile — multi-stage, node:20-alpine

```dockerfile
# ---- deps ----
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- build ----
FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---- run ----
FROM node:20-alpine AS run
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
COPY --from=build /app/seed ./seed
RUN mkdir -p /app/data && chown -R node:node /app
USER node
EXPOSE 3000
CMD ["node", "server.js"]
```

Notes for the builder:
- `seed/` must be copied into the image — first boot initializes the store from
  `seed/evidence.json`.
- `data/` is created and owned by the `node` user so the file backend can write.
- All runtime deps (SheetJS, mammoth, @solana/web3.js, @upstash/redis) are pure
  JS — no native modules, so alpine needs no build tools. If `npm ci` ever pulls
  a native module, that is a signal an unauthorized dependency was added.

### 3. docker-compose.yml — TWO services behind profiles (never both at once)

```yaml
services:
  dev:
    profiles: ["dev"]
    image: node:20-alpine
    working_dir: /app
    command: sh -c "npm install && npm run dev"
    ports:
      - "3000:3000"
    env_file: .env.local
    environment:
      STORAGE_BACKEND: file
      WATCHPACK_POLLING: "true"
    volumes:
      - .:/app
      - node_modules:/app/node_modules

  app:
    profiles: ["prod"]
    build: .
    ports:
      - "3000:3000"
    env_file: .env.local
    environment:
      STORAGE_BACKEND: file
    volumes:
      - ./data:/app/data

volumes:
  node_modules:
```

- Profiles prevent a port clash: `--profile dev` for the team loop,
  `--profile prod` for clean-build verification. Plain `docker compose up`
  starts neither — that is intentional.
- `dev` bind-mounts the whole repo, so edits on the host hot-reload in the
  container. The named `node_modules` volume keeps container-installed modules
  from colliding with any host `node_modules`.
- `WATCHPACK_POLLING=true` makes file-watching reliable under WSL2/Docker
  Desktop. Team note: keep the repo inside the WSL filesystem (`~/...`), not
  under `/mnt/c/...`, or hot reload will be slow regardless.
- `STORAGE_BACKEND=file` is forced in both services regardless of .env.local,
  so containers never depend on Upstash.
- In `app`, the `./data` bind mount is what makes actions survive
  `docker compose restart`.

### 4. .dockerignore

```
node_modules
.next
.git
data
seed_docs
*.md
.env*
```

(`data` is excluded from the build context because it arrives via the volume;
`.env*` stays out of the image and is injected by compose.)

### 5. README section — append verbatim under "Running locally"

```markdown
### Option B — Docker (no Node required)
cp .env.example .env.local   # set GEMINI_API_KEY; SOLANA_SECRET_KEY optional
docker compose up --build
Open http://localhost:3000 — the app boots pre-loaded with the demo dataset.
Created actions persist in ./data across restarts.
Note: without GEMINI_API_KEY the app is fully usable on the seeded data;
only live re-extraction of PDF/DOCX uploads needs the key. The Excel
re-upload demo (auto-verify) works with no keys at all.
```

Also create `.env.example` with all five env var names, empty values, and a
one-line comment each.

## Acceptance test (DONE WHEN all four pass)

1. `docker compose up --build` reaches "ready" with no errors on a clean clone.
2. http://localhost:3000 shows the dashboard populated from seed.
3. Create an action in the browser → `docker compose restart` → the action is
   still there (proves the volume + file backend).
4. Upload `S_payroll_headcount_2025_FIXED.xlsx` on /upload inside the container
   → the S-WAGE action flips to resolved_verified (proves the no-AI path works
   with zero API keys in the container).

## Time budget

20 minutes including the acceptance test. If the image build fights you for more
than 10 minutes (usually a standalone-output path issue), abandon this phase —
the npm instructions in the README already satisfy the Devpost "run locally"
requirement, and no judge will penalize a missing Dockerfile at a one-day
hackathon.
