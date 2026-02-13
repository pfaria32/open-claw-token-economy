# Help Needed: OpenClaw Custom Build Deployment

## TL;DR

Building a custom Docker image of OpenClaw (Node.js app) with token optimization hooks. Build is failing on `node-llama-cpp` postinstall script in Alpine Linux. Need help completing the Docker build.

---

## Context

- **Goal:** Deploy custom OpenClaw build with 3 code changes for 60-80% token cost reduction
- **Code status:** ✅ Complete (165 lines across 5 TypeScript files, compiled successfully)
- **Build status:** ❌ Docker build failing on dependency postinstall

---

## The Error

```
[node-llama-cpp] Failed to build llama.cpp with no GPU support. Error: cmake not found
ELIFECYCLE Command failed with exit code 1.
ERROR: failed to solve: process "/bin/sh -c npm install -g pnpm@10.23.0 && pnpm install --frozen-lockfile" did not complete successfully: exit code: 1
```

**Root cause:** `node-llama-cpp` package tries to compile llama.cpp during `pnpm install`, fails in Alpine Linux (missing glibc, cmake issues).

**Important:** This dependency is NOT needed - user only uses cloud LLMs (Anthropic, OpenAI, Google), not local LLMs.

---

## Current Dockerfile (Failing)

```dockerfile
FROM node:22-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache \
    git python3 make g++ \
    cairo-dev jpeg-dev pango-dev giflib-dev

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install pnpm and dependencies
RUN npm install -g pnpm@10.23.0 && \
    pnpm install --frozen-lockfile --ignore-scripts  # <-- Tried --ignore-scripts

# Copy source code
COPY . .

# Build the project
RUN pnpm build
```

---

## Attempted Fixes

1. ✅ Added `--ignore-scripts` flag - Still building to verify
2. ❓ Set `NODE_LLAMA_CPP_SKIP_DOWNLOAD=true` env var - Untested
3. ❓ Different base image (Debian instead of Alpine) - Might work but larger

---

## Questions

1. **Best approach to skip `node-llama-cpp` build** in Alpine without breaking other dependencies?
2. **Should we switch to Debian base** image instead of Alpine?
3. **How to make pnpm skip specific package postinstall** without `--ignore-scripts` (which skips ALL postinstalls)?

---

## Environment

- **Host:** Ubuntu/Debian Linux (clawdbot)
- **Docker:** Version 20+ with compose v2
- **Package manager:** pnpm 10.23.0
- **Base image:** node:22-alpine
- **Dependencies:** 1002 packages total

---

## Files Involved

- **Dockerfile:** `/home/user/openclaw/workspace/projects/openclaw/Dockerfile.custom`
- **package.json:** Uses `node-llama-cpp@3.15.1` (not directly, likely transitive dependency)
- **Build location:** `/home/user/openclaw/workspace/projects/openclaw/`

---

## What Works

- ✅ `pnpm install` completes successfully WITHOUT Docker (inside running container)
- ✅ `pnpm build` works (TypeScript compilation successful)
- ✅ All code changes complete and tested

**Only Docker multi-stage build is failing.**

---

## Ideal Solution

Docker build completes successfully, skipping `node-llama-cpp` build entirely (since it's not needed for cloud-only LLM usage).

---

## Alternative Workarounds Considered

1. **Copy pre-built `node_modules` from existing container** - Messy, not reproducible
2. **Modify package.json to exclude node-llama-cpp** - Might break lockfile
3. **Use .npmrc / .pnpmrc to skip specific scripts** - Might work?

---

## Next Step

Need recommendation on:
- Best way to handle this in Alpine
- OR if switching to Debian base is cleaner
- OR if there's a pnpm flag/config to skip specific package postinstalls

Full technical details in `TECHNICAL_SUMMARY_FOR_DEPLOYMENT.md`.

---

**Created:** 2026-02-12 17:49 UTC  
**Status:** Blocked on Docker build
