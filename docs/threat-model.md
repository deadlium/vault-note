# VaultNote Threat Model & Security Architecture

This document formalizes the threat model, trust boundaries, attacker profiles, cryptographic mechanisms, and operational security boundaries for **VaultNote**.

---

## 1. System Overview & Core Philosophy

VaultNote is an **offline-first, zero-knowledge personal credential and encrypted data vault** for mobile platforms (iOS and Android).

### Core Principles
1. **Zero Cloud Requirement**: VaultNote operates strictly local-first. There is no remote authentication server, no centralized database, and no synchronization backend.
2. **Zero Telemetry / Zero Tracking**: No network calls, telemetry beacons, crash analytics pings, or tracking pixels are ever transmitted.
3. **Defense-in-Depth Cryptography**: Sensitive material is encrypted at rest using industry-standard authenticated encryption, anchored to device hardware security modules.
4. **Transparent Auditability**: The entire codebase is open-source to allow independent verification of cryptographic implementations.

---

## 2. Trust Boundaries & Enclaves

```text
┌──────────────────────────────────────────────────────────────┐
│ USER SPACE (App Process)                                     │
│                                                              │
│  ┌───────────────────────┐       ┌────────────────────────┐  │
│  │ Ephemeral RAM State   │       │ React Native UI Engine │  │
│  │ - Session Tokens      │       │ - Zero Plaintext Disk  │  │
│  │ - Decrypted In-Memory │       │ - Anti-Snapshot Shield │  │
│  └──────────┬────────────┘       └────────────────────────┘  │
│             │                                                │
│  ═══════════╪══════════════════════════════════════════════  │
│  CRYPTOGRAPHIC PERIMETER                                     │
│             │                                                │
│  ┌──────────▼────────────┐       ┌────────────────────────┐  │
│  │ Argon2id Derivation   │       │ AES-256-GCM Encryption │  │
│  │ (Memory-hard KDF)     │       │ (Ciphertext + 128 Auth)│  │
│  └──────────┬────────────┘       └───────────┬────────────┘  │
└─────────────┼────────────────────────────────┼───────────────┘
              │                                │
              ▼                                ▼
┌──────────────────────────┐     ┌─────────────────────────────┐
│ Hardware Security Module │     │ Local Storage               │
│ - iOS Keychain / Enclave │     │ - Encrypted SQLite (Cipher) │
│ - Android Keystore       │     │ - Unique per-item Nonce/IV  │
└──────────────────────────┘     └─────────────────────────────┘
```

### Trust Zones
1. **Volatile Memory (RAM)**: Holds decrypted records only while the user is actively viewing or editing them, or during an authenticated vault session.
2. **Hardware Security Module (Secure Enclave / Keystore)**: Holds the Master Enclave Key and protects biometric unlock release tokens. Keys never leave the hardware module unencrypted.
3. **Persistent File Storage (Flash Disk)**: Completely untrusted. Contains only encrypted SQLite databases, encrypted backups, and non-sensitive configuration metadata.

---

## 3. Cryptographic Key Hierarchy

VaultNote uses a multi-tiered key architecture separating user authentication from data encryption:

```text
               Master Password (+ User Salt)
                             │
                             ▼
              Argon2id Key Derivation Function
               (m=64MB, t=4, p=4, 32-byte output)
                             │
                             ▼
                 Key Encryption Key (KEK)
                             │
            ┌────────────────┴────────────────┐
            ▼                                 ▼
   [Hardware Biometric Token]        [Master Password Unlock]
            │                                 │
            └────────────────┬────────────────┘
                             │
                             ▼
                  Data Encryption Key (DEK)
                             │
                             ▼
            AES-256-GCM Authenticated Encryption
              (Unique 96-bit Nonce per write)
                             │
                             ▼
               Encrypted SQLite Vault Database
```

* **Master Password**: Never stored anywhere (neither plaintext nor hashed).
* **Salt**: 32-byte cryptographically secure random value generated via OS CSPRNG, stored alongside the database header.
* **Argon2id Parameters**:
  * Memory Cost ($m$): $64\text{ MB}$ ($65,536\text{ KB}$)
  * Iterations / Time Cost ($t$): $4$
  * Parallelism ($p$): $4$
  * Hash Length: $32\text{ bytes}$ ($256\text{ bits}$)
* **AES-256-GCM**:
  * 256-bit key length.
  * 96-bit unique nonce/IV per encrypted item (ensuring zero nonce reuse).
  * 128-bit authentication tag validating ciphertext integrity and authenticity prior to decryption.

---

## 4. Threat Analysis & Mitigations (STRIDE)

| Threat Category | Potential Attack Vector | VaultNote Mitigation |
| --------------- | ----------------------- | -------------------- |
| **Spoofing** | Unauthorized user unlocks vault without master password or biometric authentication. | Biometric authentication is delegated to the hardware Secure Enclave. Failed biometric attempts fall back to master password verification. Session tokens expire upon auto-lock timeout. |
| **Tampering** | Attacker modifies SQLite file on disk to inject altered payloads or corrupt records. | All secret fields use AES-256-GCM with a 128-bit authentication tag. Any bit-level tampering causes decryption to fail immediately with an authentication error. |
| **Repudiation** | Unauthorized deletion or restoration of database without user consent. | Database operations require an active authenticated session. Backups require explicit user authentication to export or import. |
| **Information Disclosure** | Device theft; extraction of SQLite file via forensic tools or unencrypted backup. | Entire secret payload is encrypted with AES-256-GCM. Decryption keys are stored inside hardware Keystore/Keychain or derived on-the-fly from the master password. |
| **Information Disclosure** | Clipboard snooping by background applications. | Sensitive items copied to the system clipboard trigger an automatic cleanup routine that purges clipboard data after 30 seconds. |
| **Information Disclosure** | Application switcher snapshot capture by operating system. | Anti-snapshot screen protection cloaks the UI with an opaque security mask whenever the application loses active focus or enters the background. |
| **Denial of Service** | Corrupted database file or invalid backup import crash the app. | Strict input schema validation via Zod and safe error boundaries around database deserialization prevent crashes on malformed data. |
| **Elevation of Privilege** | Malicious third-party app attempts IPC or URI scheme injection. | VaultNote exposes no exported Android activities or iOS URL schemes that execute unauthenticated vault actions. |

---

## 5. Security Boundaries & Non-Goals

### Security Guarantees
* **Data-at-Rest Confidentiality**: Without the master password or biometric release, database extraction yields only ciphertext indistinguishable from random data.
* **Integrity & Authenticity**: Tampering with stored records is detected cryptographically before decryption.
* **Zero Telemetry**: No user actions, passwords, item titles, metadata, or diagnostic details ever leave the device.

### Non-Goals (Out of Scope)
* **Compromised Host OS / Kernel Malware**: If the device is rooted or jailbroken, an adversary with root privileges or memory-inspection hooks can inspect process RAM while the vault is unlocked.
* **Malicious Keyboards**: Third-party custom keyboard extensions on iOS/Android can capture keystrokes. Users are advised to use trusted stock system keyboards.
* **Shoulder Surfing / Coercion**: Physical observation of master password entry cannot be stopped cryptographically. VaultNote supports an optional **Duress Vault** (decoy profile) for coercion resistance.
* **Hardware Laboratory Attacks**: Physical decapping of the Secure Enclave processor or bus-interposer attacks are outside the scope of mobile software mitigations.

---

## 6. Emergency Recovery Kit Architecture

VaultNote implements a **BIP-39 24-word mnemonic emergency kit**:
* Generated using $256\text{ bits}$ of entropy from the platform's Cryptographically Secure Pseudo-Random Number Generator (CSPRNG).
* The recovery mnemonic derives an alternate Emergency Key Encryption Key capable of decrypting the database in the event that the master password is forgotten.
* The recovery kit is designed to be written down or printed offline; it is never backed up to any cloud service.
