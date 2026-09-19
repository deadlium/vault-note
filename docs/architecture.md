# VaultNote Architecture & Engineering Guide

This document outlines the software architecture, design patterns, domain layers, and engineering practices used across **VaultNote**.

---

## Architecture Pattern: Clean Architecture

VaultNote follows a unidirectional Clean Architecture designed for offline-first resilience, testability, and strict security boundaries:

$$\text{UI Components / Screens} \longrightarrow \text{Hooks / State} \longrightarrow \text{Domain Use Cases} \longrightarrow \text{Infrastructure & Core Crypto} \longrightarrow \text{SQLite Encrypted DB}$$

```text
┌──────────────────────────────────────────────────────────────┐
│ Presentation Layer                                            │
│ - Expo Router (File-based navigation)                        │
│ - Screens: Auth, Vault, Search, Favorites, Settings          │
│ - Design System Components & Obsidian Theme Tokens          │
└──────────────────────────────┬───────────────────────────────┘
                               │
┌──────────────────────────────▼───────────────────────────────┐
│ Application & State Layer                                     │
│ - Zustand Vault Session Store                                │
│ - React Hook Form + Zod Schema Validation                    │
│ - Custom React Hooks (useTOTP, useClipboard, useBiometric)   │
└──────────────────────────────┬───────────────────────────────┘
                               │
┌──────────────────────────────▼───────────────────────────────┐
│ Domain & Business Logic Layer                                │
│ - Vault Item CRUD & Ephemeral Search Evaluation              │
│ - TOTP RFC 6238 Engine & Drift Compensator                   │
│ - Password Generator (CSPRNG Entropy Engine)                 │
│ - Security Center Hygiene Scoring                            │
│ - Backup Serialization & Deserialization                     │
└──────────────────────────────┬───────────────────────────────┘
                               │
┌──────────────────────────────▼───────────────────────────────┐
│ Core Infrastructure & Cryptographic Layer                     │
│ - Argon2id Key Derivation Primitive                          │
│ - AES-256-GCM Authenticated Encryption / Decryption         │
│ - SecureStore / KeyStore / KeyChain Hardware Bridge          │
│ - SQLite Connection & Schema Migration Runner               │
│ - Auto-Wiping Clipboard Manager                              │
│ - Session Lock State Machine & Background Blur Shield        │
└──────────────────────────────────────────────────────────────┘
```

---

## Directory Structure

```text
apps/
└── mobile/
    ├── app/                              # Expo Router file-based navigation
    │   ├── _layout.tsx                   # Root layout, providers & session guards
    │   ├── index.tsx                     # Entrypoint & lock redirection
    │   ├── (auth)/                       # Authentication & onboarding routes
    │   │   ├── setup.tsx                 # Master password & enclave initialization
    │   │   ├── unlock.tsx                # Biometric & password unlock screen
    │   │   └── recovery.tsx              # BIP-39 emergency kit restoration
    │   └── (vault)/                      # Authenticated vault routes
    │       ├── _layout.tsx               # Main navigation & bottom tabs
    │       ├── index.tsx                 # Vault home dashboard
    │       ├── search.tsx                # Ephemeral search screen
    │       ├── favorites.tsx             # Starred & pinned items hub
    │       ├── item/
    │       │   ├── new.tsx               # Add secret modal / selector
    │       │   └── [id].tsx              # Detail view, mask & unmask
    │       └── settings/
    │           ├── index.tsx             # Settings overview
    │           ├── security.tsx          # Security center & policy controls
    │           └── backup.tsx            # Export, import & recovery tools
    └── src/
        ├── features/                     # Feature modules
        │   ├── authentication/           # Master password, unlock & session
        │   ├── vault/                    # Item CRUD, indexing, schemas
        │   ├── totp/                     # RFC 6238 engine & countdown timers
        │   ├── password-generator/       # CSPRNG generator & entropy scoring
        │   ├── search/                   # In-memory query evaluation
        │   ├── security-center/          # Hygiene scoring & breach auditing
        │   └── backup/                   # Encrypted serialization & export
        ├── core/                         # Low-level infrastructure & singletons
        │   ├── crypto/                   # Argon2id, AES-GCM, CSPRNG primitives
        │   ├── database/                 # SQLite connection & migrations
        │   ├── storage/                  # Platform SecureStore bridge
        │   ├── biometric/                # Local authentication wrapper
        │   ├── clipboard/                # Auto-expiring clipboard manager
        │   └── session/                  # VaultSessionManager state machine
        ├── components/                   # Design system primitives & components
        ├── theme/                        # Design tokens (colors, spacing, typography)
        └── types/                        # Global domain models & contracts
```

---

## State & Session Lifecycle

### VaultSessionManager State Machine
The vault lifecycle moves strictly through four states:
1. **`UNINITIALIZED`**: The device has no existing vault database or hardware keys. Redirects to Master Password onboarding (`(auth)/setup`).
2. **`LOCKED`**: Database exists on disk, but encryption keys are not in memory. All vault routes are inaccessible. Prompts for biometric unlock or master password (`(auth)/unlock`).
3. **`UNLOCKED`**: Active authenticated session. The Data Encryption Key (DEK) is held in memory. Inactivity timer runs in the background.
4. **`BACKGROUNDED`**: App moved to background. Anti-snapshot mask rendered over UI immediately. Inactivity countdown triggers auto-lock when threshold is reached.

---

## Security Invariants

All contributors and PRs must maintain the following architectural invariants:
1. **Never Persist Unencrypted Secrets**: Plaintext passwords, TOTP seeds, notes, and keys must never be written to SQLite or file storage unencrypted.
2. **Zero Network Calls**: The app must contain no network-fetching libraries in vault code paths.
3. **Strict Type Safety**: TypeScript `strict: true` is enforced across all modules; `any` types are prohibited.
4. **Explicit Nonce Freshness**: Every encryption call must generate a new 96-bit CSPRNG nonce.
