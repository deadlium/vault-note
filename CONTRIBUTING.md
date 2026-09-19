# Contributing to VaultNote

Thank you for your interest in contributing to **VaultNote**! As an open-source, offline-first, zero-knowledge vault, we rely on developers, cryptographers, security auditors, and UX designers to build an uncompromising privacy tool for the world.

---

## Code of Conduct

All contributors are expected to uphold our [Code of Conduct](CODE_OF_CONDUCT.md). Please read it to understand our community standards and enforcement guidelines.

---

## 🔒 Mandatory Core Principles (Non-Negotiable)

Before writing code or opening pull requests, you must understand VaultNote's fundamental invariants:

1. **Strict Zero-Cloud Policy**: VaultNote must remain 100% offline. Pull requests that introduce remote database dependencies, cloud sync services, analytics SDKs, crash trackers (like Sentry or Firebase Analytics), or background telemetry will be closed immediately.
2. **Zero Plaintext Persistence**: No password, note, card number, private key, or recovery seed may ever be stored on persistent disk unencrypted.
3. **Cryptographic Rigor**: Any modification to `core/crypto/`, key derivation routines (Argon2id), encryption ciphers (AES-256-GCM), or entropy generators (CSPRNG) must include:
   - Exhaustive unit tests with known test vectors.
   - Comprehensive justification of why the change is necessary.
   - A security analysis demonstrating alignment with [docs/threat-model.md](docs/threat-model.md).

---

## Getting Started

### Prerequisites
* **Node.js**: v18.0.0 or higher
* **npm** or **yarn**
* **Expo CLI** (`npm install -g expo-cli`)
* **iOS Development**: macOS with Xcode 15+ and CocoaPods (for iOS Simulator)
* **Android Development**: Android Studio, Android SDK 34+, and emulator configured

### Local Setup

1. **Fork and Clone** the repository:
   ```bash
   git clone https://github.com/<your-username>/vault-note.git
   cd vault-note
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Start the Development Server**:
   ```bash
   npm run start
   ```

4. **Launch Simulator / Device**:
   - Press `i` to open in iOS Simulator.
   - Press `a` to open in Android Emulator.
   - Scan QR code with Expo Go app for physical device testing.

---

## Development Workflow & Standards

### Coding Standards
* **TypeScript**: Strict mode is enabled (`"strict": true`). Do not use `any`; use appropriate domain types or `unknown` with type guards.
* **Code Formatting**: Format all code using Prettier prior to committing (`npx prettier --write .`).
* **Linting**: Ensure all ESLint rules pass (`npm run lint`).
* **Component Architecture**: Keep UI components decoupled from cryptographic and database operations. Use domain hooks and use cases.

### Git Commit Conventions
We follow the [Conventional Commits](https://www.conventionalcommits.org/) standard. Commit messages must be structured as follows:

```text
<type>(<scope>): <short summary>

[optional body]

[optional footer]
```

#### Allowed Types:
* `feat`: A new feature or capability.
* `fix`: A bug fix.
* `security`: Cryptographic enhancements, vulnerability patches, or privacy protections.
* `docs`: Documentation updates or additions.
* `style`: Code style, formatting, whitespace adjustments.
* `refactor`: Code reorganization without changing external behavior.
* `test`: Adding or modifying tests.
* `chore`: Build configuration, dependency upgrades, or CI tasks.

#### Example:
```bash
git commit -m "security(clipboard): enforce 30-second TTL on copied TOTP tokens"
```

---

## Testing Requirements

Every pull request must maintain or increase test coverage.

```bash
# Run unit and cryptographic tests
npm test

# Run tests with coverage
npm test -- --coverage

# Typecheck TypeScript files
npm run typecheck

# Lint the codebase
npm run lint
```

---

## Pull Request Guidelines

1. **Branch Naming**:
   - `feature/your-feature-name`
   - `fix/issue-description`
   - `security/vulnerability-mitigation`
   - `docs/topic-name`

2. **Keep PRs Focused**: Avoid massive, multi-purpose pull requests. Smaller, well-tested PRs are reviewed and merged much faster.

3. **Fill Out the PR Template**: Ensure every item in [.github/PULL_REQUEST_TEMPLATE.md](.github/PULL_REQUEST_TEMPLATE.md) is addressed, especially the Zero-Cloud and Security verification checklists.

4. **Review Process**: At least one maintainer review is required before merging. Changes affecting cryptographic primitives require dual-maintainer review.

---

## Reporting Issues

* **Bug Reports**: Please open an issue using the [Bug Report Template](.github/ISSUE_TEMPLATE/bug_report.md).
* **Feature Proposals**: Open an issue using the [Feature Request Template](.github/ISSUE_TEMPLATE/feature_request.md).
* **Security Vulnerabilities**: **DO NOT** create a public issue. Follow our [Security Policy](SECURITY.md) to report vulnerabilities privately.

Thank you for helping us keep personal privacy accessible to everyone!
