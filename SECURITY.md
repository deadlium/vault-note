# Security Policy

VaultNote is an offline-first, zero-knowledge personal credentials and encrypted note vault. Because users entrust VaultNote with their most sensitive digital identities and secrets, security, cryptographic rigor, and privacy are foundational.

We take all security vulnerability reports with the highest priority and are committed to working with security researchers, cryptographers, and privacy advocates through responsible disclosure.

---

## Supported Versions

Only the latest release and the current `master`/`main` development branch receive active security updates.

| Version / Branch | Supported          |
| ---------------- | ------------------ |
| `main` / `master`| :white_check_mark: |
| Latest Release   | :white_check_mark: |
| Older Releases   | :x:                |

---

## Reporting a Vulnerability

> [!CAUTION]
> **Please do NOT report security vulnerabilities via public GitHub issues, discussions, or pull requests.**

### Preferred Method: GitHub Private Vulnerability Reporting
You can report a vulnerability privately through GitHub:
1. Navigate to the **Security** tab of this repository.
2. Click **Report a vulnerability** under "Vulnerability reporting".
3. Provide full reproduction details and impact analysis.

### Alternative Method: Direct Security Team Contact
If you prefer email or cannot use GitHub Private Reporting:
- **Email**: `security@vaultnote.app`
- **PGP Encryption**: For highly sensitive vulnerability details, please request our public PGP key via initial email before transmitting exploit proofs-of-concept.

### What to Include in Your Report
To help us triage and resolve the issue quickly, please provide:
1. **Description**: Summary of the vulnerability and its potential impact.
2. **Affected Component**: File(s), functions, cryptographic primitives, or navigation flows affected.
3. **Proof of Concept / Steps to Reproduce**: Detailed, step-by-step instructions or minimal code sample demonstrating the flaw.
4. **Environment**: Target platform (iOS / Android), OS version, device architecture, and app version / commit SHA.
5. **Mitigation Idea** (optional): Any proposed patch or corrective action.

---

## Response Timeline & SLAs

When a security vulnerability is reported:
* **Initial Acknowledgment**: Within **48 hours** of report receipt.
* **Triage & Validation**: Within **7 business days**, confirming reproduction or requesting clarification.
* **Resolution & Patching**: Remediation timeline determined based on severity (Critical: target < 14 days; High: target < 30 days).
* **Public Disclosure**: Coordinated disclosure after a patched version is published and users have reasonable time to update.

---

## Scope & Vulnerability Classification

### In-Scope Vulnerabilities
We actively seek reports on:
* **Cryptographic Weaknesses**: Flaws in key derivation (Argon2id), symmetric authenticated encryption (AES-256-GCM), entropy generation (CSPRNG), or IV/nonce reuse.
* **Key Material Leakage**: Unencrypted keys, master passwords, or raw secrets leaked to disk, unencrypted SQLite fields, device logs, application crash traces, or persistent system caches.
* **Local Authentication Bypass**: Circumvention of biometric authentication (Face ID / Touch ID / BiometricPrompt) or master password locks.
* **Memory Residuals**: Secrets persisting indefinitely in RAM after vault lock without zeroization or garbage collection sweeps.
* **Clipboard Bleed**: Failure to sanitize or purge decrypted secrets from the system clipboard within the designated auto-wipe window.
* **Anti-Snapshot Failures**: Plaintext vault screens exposed in OS application switcher snapshots.
* **Backup Integrity & Decryption Flaws**: Tampering, forgeable authentication tags, or decryption vulnerabilities in `.vaultnote` backup archives.

### Out-of-Scope Risks
The following scenarios are considered outside our threat model and will generally not be treated as application vulnerabilities:
* **Compromised Operating Systems**: Attacks conducted on rooted Android or jailbroken iOS devices where kernel or root-level malware has hooked memory or system APIs.
* **Physical Hardware Decapping / Enclave Extraction**: Specialized laboratory physical attacks on the device's hardware Secure Enclave / Titan M security chip.
* **Social Engineering & Shoulder Surfing**: Physical observation of a user entering their master password or disclosing their 24-word recovery phrase.
* **Local Denial of Service**: Exploits requiring physical device access to deliberately fill disk storage or exhaust battery.

---

## Safe Harbor & Research Ethics

We consider security research conducted under this policy to be authorized. We will not pursue legal action against researchers who:
1. Make a good faith effort to avoid privacy violations, data destruction, and service interruption.
2. Maintain confidentiality until a patch is released and public disclosure is mutually coordinated.
3. Comply with local laws and regulations.

Thank you for helping keep VaultNote and its users secure!
