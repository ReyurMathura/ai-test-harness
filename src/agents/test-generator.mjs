import fs from 'fs';
import path from 'path';

import {
  generateStructuredOutput
} from '../ai/provider.mjs';

const testPlanPath = process.argv[2];
const applicationContextPath = process.argv[3];

if (!testPlanPath || !applicationContextPath) {
  console.error(
    'Usage: node src/agents/test-generator.mjs <test-plan-file> <application-context-file>'
  );

  process.exit(1);
}

const testPlan = JSON.parse(
  fs.readFileSync(testPlanPath, 'utf-8')
);

const applicationContext = JSON.parse(
  fs.readFileSync(applicationContextPath, 'utf-8')
);

//
// Only generate tests that:
//
// 1. were approved by the planner for automation
// 2. have sufficient live application evidence
//

const evidenceByScenario = new Map(
  applicationContext.scenarioEvidence.map(
    evidence => [evidence.scenarioId, evidence]
  )
);

const approvedScenarios =
  testPlan.scenarios
    .filter(
      scenario => scenario.automationReady === true
    )
    .filter(scenario => {
      const evidence =
        evidenceByScenario.get(scenario.id);

      return (
        evidence &&
        evidence.automationEvidenceSufficient === true
      );
    })
    .map(scenario => ({
      scenario,
      evidence:
        evidenceByScenario.get(scenario.id)
    }));

if (approvedScenarios.length === 0) {
  console.error(
    'No scenarios have sufficient evidence for automation.'
  );

  process.exit(1);
}

const generatorSchema = {
  type: 'object',
  additionalProperties: false,

  required: [
    'code',
    'generatedScenarioIds'
  ],

  properties: {
    code: {
      type: 'string'
    },

    generatedScenarioIds: {
      type: 'array',
      items: {
        type: 'string'
      }
    }
  }
};

const prompt = `
You are a senior Quality Engineer specialising in Playwright and TypeScript.

Generate executable Playwright tests using the supplied approved
test scenarios and live application evidence.

RULES:

1. Generate TypeScript using @playwright/test.

2. Generate tests only for the scenarios supplied below.

3. Do not invent additional scenarios.

4. Requirement meaning comes from the approved test scenario.

5. Implementation details must come only from the observed
   application evidence.

6. Do not invent selectors, URLs, API endpoints, page text,
   status codes or application behaviour.

7. Prefer resilient Playwright locators in this order where appropriate:
   - getByRole
   - getByLabel
   - getByPlaceholder
   - getByTestId

8. Every test must contain at least one meaningful,
   deterministic assertion.

9. Assertions must prove the approved expected result.

10. Observed UI evidence may be used to make assertions more precise,
    but must not change the requirement being tested.

11. Do not use arbitrary waits such as waitForTimeout.

12. Do not silently weaken assertions to make tests pass.

13. Do not generate API tests unless an application API was
    actually observed and is relevant to the scenario.

14. Do not assert against analytics or telemetry requests.

15. Do not expose or log passwords or other secrets.

16. Use the configured Playwright baseURL.
    Prefer page.goto('/') where appropriate.

17. Include the scenario ID in the test title.

18. Generate complete executable code.

APPROVED SCENARIOS WITH LIVE EVIDENCE:

${JSON.stringify(approvedScenarios, null, 2)}
`;

console.log(
  `Generating tests from: ${testPlanPath}`
);

console.log(
  `Using evidence from: ${applicationContextPath}`
);

console.log(
  `Approved scenarios with sufficient evidence: ${approvedScenarios.length}`
);

console.log(
  `Using AI provider: ${process.env.AI_PROVIDER ?? 'codex'}`
);

const result = await generateStructuredOutput({
  prompt,
  schema: generatorSchema,

  approvalPolicy: 'never',
  sandbox: 'read-only'
});

const filename =
  path.basename(
    testPlanPath,
    '-test-plan.json'
  );

const outputPath =
  `tests/generated/${filename}.spec.ts`;

fs.mkdirSync(
  path.dirname(outputPath),
  { recursive: true }
);

fs.writeFileSync(
  outputPath,
  result.code
);

console.log('');
console.log('Playwright tests generated.');
console.log(`Output: ${outputPath}`);

console.log(
  `Scenarios generated: ${result.generatedScenarioIds.join(', ')}`
);