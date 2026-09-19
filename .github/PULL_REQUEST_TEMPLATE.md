## Summary of Changes

A concise summary of the changes proposed in this Pull Request.

Fixes #(issue number)

---

## Type of Change
- [ ] 🐛 Bug fix (non-breaking change which fixes an issue)
- [ ] ✨ New feature (non-breaking change which adds functionality)
- [ ] 🛡️ Security / Cryptography enhancement
- [ ] 📝 Documentation update
- [ ] 🎨 Style / Refactor (no functional changes)
- [ ] 🧪 Tests (adding or updating unit/E2E tests)
- [ ] 🔧 Chore / Build configuration

---

## 🔒 Zero-Cloud & Privacy Compliance Checklist
* [ ] **Strict Offline Verification**: I have verified that this PR does **not** introduce any network calls, remote telemetry, analytics beacons, or cloud service dependencies.
* [ ] **Zero Plaintext Disk Persistence**: No passwords, private keys, TOTP seeds, or secret notes are stored unencrypted.
* [ ] **Threat Model Consistency**: If changes touch cryptography (`core/crypto/`), key derivation, or storage routines, they strictly adhere to [../docs/threat-model.md](../docs/threat-model.md).

---

## Quality & Testing Checklist
- [ ] My code adheres to the project's coding standards and ESLint rules (`npm run lint`).
- [ ] Strict TypeScript compiles with zero errors (`npm run typecheck`).
- [ ] All unit and cryptographic tests pass (`npm test`).
- [ ] I have added automated tests covering any new functionality or bug fixes.
- [ ] I have verified this change on iOS Simulator and/or Android Emulator.
- [ ] Documentation has been updated to reflect these changes (if applicable).
