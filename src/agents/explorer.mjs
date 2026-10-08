import fs from 'fs';
import path from 'path';
import Ajv from 'ajv';

import {
  applicationContextSchema
} from '../schemas/application-context-schema.mjs';

import {
  generateStructuredOutput
} from '../ai/provider.mjs';

const requirementPath = process.argv[2];
const testPlanPath = process.argv[3];

if (!requirementPath || !testPlanPath) {
  console.error(
    'Usage: node src/agents/explorer.mjs <requirement-file> <test-plan-file>'
  );

  process.exit(1);
}

const requirements = fs.readFileSync(
  requirementPath,
  'utf-8'
);

const testPlan = JSON.parse(
  fs.readFileSync(testPlanPath, 'utf-8')
);

const automationScenarios =
  testPlan.scenarios.filter(
    scenario => scenario.automationReady === true
  );

const prompt = `
You are a senior Quality Engineering exploration agent.

You have access to:

- Playwright MCP
- Chrome DevTools MCP

Your job is to inspect the real application and collect factual evidence
needed to automate the approved test scenarios.

Use Playwright MCP for:
- browser navigation
- controls
- accessible names
- placeholders
- input types
- test IDs
- user interactions
- visible application state

Use Chrome DevTools MCP for:
- network requests
- HTTP methods
- response statuses
- content types
- identifying application APIs
- distinguishing APIs from static assets and telemetry

RULES:

1. Explore the actual application. Do not infer application behaviour
   from general knowledge.

2. Only collect evidence relevant to the supplied automation-ready
   scenarios.

3. Do not generate test code.

4. Do not invent selectors, URLs, endpoints, status codes,
   error messages or application behaviour.

5. If an API is not observed, record applicationApiObserved = false.

6. Do not assume a UI action has an API behind it.

7. Prefer durable UI evidence such as:
   accessible names,
   roles,
   placeholders,
   input types,
   data-test/test-id attributes.

8. Do not persist temporary MCP element references such as e11,
   e13 or similar session-specific references.

9. Record observable evidence that proves whether a scenario succeeded
   or failed.

10. Redact passwords, cookies, authentication tokens,
    session identifiers and other secrets from the output.

11. Do not perform destructive actions.

12. Do not perform load, brute-force or disruptive security testing.

13. If there is not enough evidence to automate a scenario reliably,
    set automationEvidenceSufficient = false and explain what is missing.

14. Report only observed facts.

SOFTWARE REQUIREMENTS:

${requirements}

APPROVED AUTOMATION-READY TEST SCENARIOS:

${JSON.stringify(automationScenarios, null, 2)}
`;

console.log(`Exploring application for: ${requirementPath}`);
console.log(
  `Automation-ready scenarios: ${automationScenarios.length}`
);
console.log(
  `Using AI provider: ${process.env.AI_PROVIDER ?? 'codex'}`
);

const context = await generateStructuredOutput({
  prompt,
  schema: applicationContextSchema,
  approvalPolicy: 'on-request',
  sandbox: 'read-only',
  autoReview: true
});

const ajv = new Ajv({
  allErrors: true
});

const validate =
  ajv.compile(applicationContextSchema);

if (!validate(context)) {
  console.error(
    'Explorer returned invalid application context.'
  );

  console.error(validate.errors);

  process.exit(1);
}

const filename =
  path.basename(
    requirementPath,
    path.extname(requirementPath)
  );

const outputPath =
  `generated/${filename}-application-context.json`;

fs.writeFileSync(
  outputPath,
  JSON.stringify(context, null, 2)
);

console.log('');
console.log('Application exploration complete.');
console.log(`Output: ${outputPath}`);
console.log(
  `Scenario evidence records: ${context.scenarioEvidence.length}`
);