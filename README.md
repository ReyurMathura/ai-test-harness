# AI Test Harness

**Requirements-driven, AI-assisted test design and automation using Playwright.**

This project explores how AI can support the software quality engineering lifecycle by generating risk-based test plans, discovering real application behaviour, creating automated tests, analysing failures, and performing controlled repairs.

The key principle is that **AI-generated automation must be grounded in requirements and observed evidence, not assumptions**.

Repository: https://github.com/ReyurMathura/ai-test-harness

## Key Features

- **Risk-based test planning:** Generate scenarios from user stories and acceptance criteria, prioritised by risk.
- **Requirements traceability:** Separate tests explicitly supported by requirements from exploratory recommendations.
- **Live application discovery:** Identify actual UI controls, locators, URLs and network activity through MCP tools.
- **API discovery:** Identify documented endpoints and collect real HTTP response evidence.
- **Automated test generation:** Generate Playwright TypeScript tests using approved scenarios and discovered evidence.
- **Test execution:** Execute automated tests across supported browsers.
- **Failure triage:** Classify failures as `APPLICATION_BUG`, `TEST_BUG`, `ENVIRONMENT_ISSUE`, `FLAKY` or `UNKNOWN`.
- **Controlled self-repair:** Attempt to repair defective automation only when supported by triage evidence.

## Technology Stack

- Node.js and JavaScript
- TypeScript
- Playwright Test
- OpenAI Codex CLI
- Ollama (optional local AI provider)
- Playwright MCP
- Chrome DevTools MCP
- Ajv for structured JSON validation

## Prerequisites

Before starting, install:

1. Node.js (version 24 recommended)
2. Git
3. OpenAI Codex CLI
4. Playwright browser binaries
5. A code editor such as VS Code

The included `.mcp.json` uses Windows commands. Non-Windows environments may require changes to their MCP server configuration.

## Installation

Clone the repository:

```bash
git clone https://github.com/ReyurMathura/ai-test-harness.git
cd ai-test-harness
```

Install dependencies:

```bash
npm ci
```

Install Playwright browsers:

```bash
npx playwright install
```

Install Codex:

```bash
npm install -g @openai/codex
```

Run `codex` and follow the authentication instructions. Ensure the CLI is available before executing the harness.

### AI Provider Configuration

Codex is the default AI provider.

The current implementation defaults to:

- `AI_PROVIDER=codex`
- `CODEX_MODEL=gpt-5.6-luna`
- `CODEX_REASONING_EFFORT=low`

If the configured model is unavailable, specify a supported Codex model using `CODEX_MODEL`.

Example PowerShell configuration:

```powershell
$env:AI_PROVIDER = "codex"
$env:CODEX_MODEL = "<supported-model>"
$env:CODEX_REASONING_EFFORT = "low"
```

The harness reads process environment variables directly; a `.env` file is not automatically loaded.

For optional local AI execution, install Ollama, pull `qwen3:14b`, ensure the Ollama server is running, and set `AI_PROVIDER=ollama`.

## Running UI Tests

The repository contains example login requirements targeting SauceDemo.

**Requirements:** `requirements/login.md`

### Step 1 — Generate a test plan

```bash
npm run qa:create-test-plan -- requirements/login.md
```

The planner analyses the requirements and generates risk-based scenarios.

Outputs:

- `generated/login-test-plan.json`
- `generated/login-test-plan.md`

Review the plan, assumptions, test priorities and automation-ready scenarios before continuing.

### Step 2 — Discover the application

```bash
npm run qa:discover-test-locators -- requirements/login.md
```

This stage uses the configured discovery tools to inspect the real application, record observed UI controls and locators, understand relevant application behaviour, and identify evidence required for each automated scenario.

Output:

`generated/login-application-context.json`

No automated test code is generated during this stage.

### Step 3 — Generate automated tests

```bash
npm run qa:create-automated-tests -- requirements/login.md
```

The generator reads the reviewed test plan and discovered application evidence.

Output:

`tests/generated/login.spec.ts`

The generated tests are based on approved scenarios and observed application behaviour.

### Step 4 — Execute automated tests

```bash
npm run qa:execute-automated-tests -- requirements/login.md
```

This validates Playwright test discovery and executes the generated scenarios.

Execution produces Playwright results, reports and failure evidence.

### Step 5 — Triage failures

If execution fails:

```bash
npm run qa:triage-test-failures -- requirements/login.md
```

The triage process compares the results with requirements, the original test plan, observed application evidence and test code.

Review:

`reports/triage.json`

Failures may be classified as:

- `APPLICATION_BUG`
- `TEST_BUG`
- `ENVIRONMENT_ISSUE`
- `FLAKY`
- `UNKNOWN`

A failed test does not automatically mean that the automation is defective.

### Step 6 — Repair defective automation

Where triage identifies an eligible test automation defect:

```bash
npm run qa:repair-test-automation -- requirements/login.md
```

The repair process attempts to generate a corrected test candidate, validate the change, execute the candidate and promote it only when validation succeeds.

It must not modify automation simply to hide genuine application defects.

## Running API Tests

The repository includes product API requirements targeting DummyJSON.

**Requirements:** `requirements/products-api.md`

### Generate API test plan

```bash
npm run qa:create-test-plan -- requirements/products-api.md
```

### Discover API operations

```bash
npm run qa:discover-api -- requirements/products-api.md
```

API discovery identifies operations supported by documentation and collects actual HTTP evidence using Node.js.

Output:

`generated/products-api-api-context.json`

### Generate API automation

```bash
npm run qa:create-api-tests -- requirements/products-api.md
```

Output:

`tests/generated/products-api.spec.ts`

Generated tests use Playwright's API request fixture and evidence-based response assertions.

### Execute API tests

```bash
npm run qa:execute-automated-tests -- requirements/products-api.md
```

## Command Reference

| Command | Description |
|---|---|
| `qa:create-test-plan` | Generate risk-based test scenarios |
| `qa:discover-test-locators` | Discover UI controls and locator evidence |
| `qa:create-automated-tests` | Generate UI Playwright automation |
| `qa:execute-automated-tests` | Execute generated tests |
| `qa:triage-test-failures` | Analyse and classify failures |
| `qa:repair-test-automation` | Attempt controlled test repair |
| `qa:discover-api` | Discover API operations and responses |
| `qa:create-api-tests` | Generate Playwright API tests |

Each command accepts a requirements file after `--`.

## Running Tests Manually

Execute a specific generated suite:

```bash
npx playwright test tests/generated/login.spec.ts
```

Run only Chromium:

```bash
npx playwright test tests/generated/login.spec.ts --project=chromium
```

Open the Playwright HTML report:

```bash
npx playwright show-report
```

The current Playwright configuration enables Chromium, Firefox and WebKit, and uses SauceDemo as its UI base URL.

## Project Structure

```text
ai-test-harness/
├── requirements/
│   ├── login.md
│   └── products-api.md
├── scripts/
│   └── ... workflow entry points
├── src/
│   ├── agents/
│   ├── ai/
│   └── schemas/
├── generated/
│   └── ... AI plans and discovery evidence
├── tests/
│   └── generated/
├── reports/
├── .mcp.json
├── package.json
└── playwright.config.ts
```

Generated plans, discovery evidence, tests and reports are excluded from Git. They are recreated through the workflow commands after cloning the repository.

## Adding New Tests

To test another feature or application:

1. Create a Markdown file inside `requirements/`.
2. Document the user story, acceptance criteria, application/API URL, test data and constraints.
3. Generate and review the risk-based test plan.
4. Run UI or API discovery as appropriate.
5. Review the resulting application evidence.
6. Generate Playwright automation.
7. Execute the tests and investigate failures before repairing anything.

Update `playwright.config.ts` when targeting a different UI application. Never commit real credentials or access tokens to requirement files.

## Design Principles

**Requirements first:** AI should not convert assumptions or general testing practices into mandatory requirements.

**Evidence before code:** Test generation must rely on observed locators, APIs and application behaviour.

**Human oversight:** Important planning, discovery and triage outputs should be reviewed.

**Defect integrity:** A genuine application bug must remain visible rather than being disguised by changes to the automated test.

**Controlled repair:** Repairs require supporting evidence and validation before promotion.

## Current Status

This is a personal proof-of-concept project demonstrating how AI can be integrated into a structured quality engineering workflow. It is intended for experimentation and further development rather than unattended production use.

**Author:** Reyur Mathura
