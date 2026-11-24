<div align="center">
  <img src="web/apps/paste/public/og.avif" height="300" alt="mehro paste" />
  <h1>mehro paste</h1>
  <p><strong>Fast, zero-knowledge, end-to-end encrypted paste sharing with burn-on-read & auto-expiry.</strong></p>

  <p>
    <a href="https://paste.mehro.me/"><img src="https://img.shields.io/badge/Live%20Demo-paste.mehro.me-10b981?style=for-the-badge&logo=vercel&logoColor=white" alt="Live Demo" /></a>
    <a href="https://github.com/Yass5002/mehro-paste"><img src="https://img.shields.io/badge/GitHub-Repository-blue?style=for-the-badge&logo=github" alt="GitHub Repo" /></a>
    <a href="LICENSE"><img src="https://img.shields.io/badge/License-AGPL--3.0-blueviolet?style=for-the-badge" alt="License: AGPL-3.0" /></a>
  </p>

  <p>
    <a href="https://paste.mehro.me/">🌐 Live App</a> •
    <a href="#features">Features</a> •
    <a href="#how-it-works">How It Works</a> •
    <a href="#architecture">Architecture</a> •
    <a href="#getting-started">Getting Started</a> •
    <a href="#deployment">Deployment</a> •
    <a href="#credits--acknowledgements">Credits</a>
  </p>
</div>

---

**[mehro paste](https://paste.mehro.me/)** is a secure, zero-knowledge paste service designed for sharing sensitive credentials, code snippets, and private messages. Everything is encrypted directly in your browser using Libsodium WebAssembly before transmission, ensuring that servers and intermediaries never have access to plaintext content or decryption keys.

---

## Features

- **Client-Side End-to-End Encryption**: Data is encrypted and decrypted locally in the browser using WebAssembly-powered Libsodium (`crypto_secretstream_xchacha20poly1305` / `crypto_secretbox_easy`).
- **Zero-Knowledge Architecture**: The master decryption key is embedded in the URL fragment (`#key`). Because browsers never send URL fragments to servers, the backend never sees or stores the key.
- **Burn-on-Read**: Pastes can be configured to self-destruct immediately after being viewed once, deleting the ciphertext atomically from storage.
- **Anti-Bot & Link Preview Defense**: Automated crawlers (such as Discord, Slack, WhatsApp, and iMessage link unfurlers) are prevented from prematurely consuming one-time pastes.
- **Optional Password Protection**: Pastes can be sealed with a custom passphrase using memory-hard Argon2id key derivation (`crypto_pwhash`).
- **Configurable Auto-Expiry**: Time-to-live (TTL) limits ranging from 1 minute to 7 days backed by native Redis expiration.
- **Modern Dark UI**: Fluid typography, responsive layout, styled QR code sharing, and animated feedback.

---

## How It Works

```mermaid
sequenceDiagram
    autonumber
    actor Sender as Sender (Browser)
    participant Worker as Web Worker (Libsodium)
    participant Server as Next.js API & Redis
    actor Receiver as Receiver (Browser)

    Sender->>Worker: Encrypt plaintext + generate master key
    Worker-->>Sender: Return ciphertext + URL fragment key
    Sender->>Server: POST /api/paste/create (Ciphertext + TTL only)
    Server-->>Sender: Return access token
    Note over Sender: Assembles link: https://paste.mehro.me/&lt;token&gt;#&lt;key&gt;

    Receiver->>Server: POST /api/paste/guard (Verify human session)
    Server-->>Receiver: Set single-use guard cookie + return wrapped key envelope
    Receiver->>Worker: Unwrap paste key with #key (+ password), before anything is burned
    Receiver->>Server: POST /api/paste/consume (Fetch & delete ciphertext)
    Server-->>Receiver: Return ciphertext (atomic Lua read + delete)
    Receiver->>Worker: Decrypt ciphertext with the unwrapped key
    Worker-->>Receiver: Display plaintext
```

> [!IMPORTANT]
> The server stores only encrypted payloads and metadata nonces. Without the URL fragment key (which remains strictly on the client), neither the hosting provider nor the database operator can read the stored paste.

---

## Architecture

| Component | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | Next.js (Pages Router) + React 19 + TypeScript | Interface, form handling, and QR generation |
| **Styling** | Material-UI (MUI) + Custom Theme Engine | Dark-mode design system |
| **Cryptography** | `libsodium-wrappers-sumo` via Comlink Web Workers | Non-blocking cryptographic operations |
| **Key Derivation** | Argon2id (`crypto_pwhash_ALG_ARGON2ID13`) | Passphrase strengthening against brute-force attacks |
| **Storage Engine** | Redis (`ioredis`) + Lua scripts | Atomic burn-on-read and native TTL expiry |
| **Guard System** | `jose` (JWT) | Cryptographic cookies preventing link preview crawlers |

---

## Getting Started

### Prerequisites

- **Node.js**: Version `22.12` or higher (required by the test runner)
- **npm**: Version `9.x` or higher
- **Redis**: Local instance or managed provider with Lua scripting (`EVAL`) support (e.g., Upstash, Redis Cloud, DragonFly)

### Installation

Clone the repository and install workspace dependencies:

```bash
git clone https://github.com/Yass5002/mehro-paste.git
cd mehro-paste/web
npm install
```

### Environment Configuration

Create a `.env.local` file in `web/apps/paste/` (or copy from root `.env.example`):

```env
# Connection string for Redis instance
REDIS_URL="redis://127.0.0.1:6379"

# Secret key used for signing anti-bot guard cookies (minimum 32 characters)
PASTE_JWT_SECRET="your-32-char-random-jwt-secret-key-here"
```

### Running Locally

Start the local development server:

```bash
npm run dev
```

Open [http://localhost:3008](http://localhost:3008) in your browser.

---

## Verification & Code Quality

Run tests, typechecks, and linting across the monorepo:

```bash
# Unit + integration tests (Vitest). Redis-backed tests start a throwaway
# `redis-server` on a random port; they are skipped if it isn't installed.
# To use a dedicated, flushable instance instead: TEST_REDIS_URL=redis://host:port
npm test

# Type check all TypeScript files
npm run typecheck

# Lint workspace packages and applications
npm run lint

# Build production bundle
npm run build
```

---

## Deployment

### Vercel

1. Import the `mehro-paste` repository into Vercel.
2. Configure project build settings:
   - **Root Directory**: `web`
   - **Framework Preset**: Next.js
   - **Build Command**: `npm run build`
   - **Output Directory**: `apps/paste/.next`
3. Configure the required environment variables (`REDIS_URL` and `PASTE_JWT_SECRET`).
4. Deploy.

### Node.js / Docker / VPS

Build and start the application in any Node.js environment:

```bash
cd web
npm ci                  # the build needs devDependencies (TypeScript, type packages)
npm run build
npm prune --omit=dev    # optional: drop build-only packages afterwards
npm start
```

> [!TIP]
> When running behind a reverse proxy (e.g., Nginx, Caddy, Cloudflare), ensure that `X-Forwarded-Proto` and `Host` headers are forwarded so that secure cookie flags and protocol detection function correctly.

---

## Credits & Acknowledgements

This project was inspired by and acknowledges the end-to-end encrypted paste sharing design and cryptographic concepts pioneered by [Ente](https://github.com/ente-io/ente) (`ente-io/ente`).

While **mehro paste** is a complete ground-up reimplementation in **TypeScript / Next.js / React 19 / Redis**, full credit is given to the Ente team for the original security principles and architecture.

---

## License

This project is licensed under the **GNU Affero General Public License v3.0 (AGPL-3.0)**. See the [LICENSE](LICENSE) file for details.
