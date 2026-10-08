import fs from 'fs';
import path from 'path';
import Ajv from 'ajv';

import {
  generateStructuredOutput
} from '../ai/provider.mjs';

import {
  repairSchema
} from '../schemas/repair-schema.mjs';

const triagePath = process.argv[2];
const testPlanPath = process.argv[3];
const applicationContextPath = process.argv[4];
const testSourcePath = process.argv[5];

if (
  !triagePath ||
  !testPlanPath ||
  !applicationContextPath ||
  !testSourcePath
) {
  console.error(
    'Usage: node src/agents/repair.mjs <triage> <test-plan> <application-context> <test-source>'
  );

  process.exit(1);
}

const triage = JSON.parse(
  fs.readFileSync(triagePath, 'utf-8')
);

const testPlan = JSON.parse(
  fs.readFileSync(testPlanPath, 'utf-8')
);

const applicationContext = JSON.parse(
  fs.readFileSync(applicationContextPath, 'utf-8')
);

const testSource = fs.readFileSync(
  testSourcePath,
  'utf-8'
);

//
// Deterministic repair gate.
//
// AI does NOT decide whether it is allowed to repair.
//

const minConfidence =
  Number(process.env.REPAIR_MIN_CONFIDENCE ?? 90);

const testBugFindings =
  triage.findings.filter(
    finding =>
      finding.classification === 'TEST_BUG'
  );

if (testBugFindings.length === 0) {
  console.error(
    'Repair blocked: triage contains no TEST_BUG findings.'
  );

  process.exit(1);
}

const blockedFindings =
  testBugFindings.filter(
    finding =>
      finding.humanReviewRequired === true ||
      finding.confidence < minConfidence
  );

if (blockedFindings.length > 0) {
  console.error(
    'Repair blocked: one or more TEST_BUG findings require human review or do not meet the confidence threshold.'
  );

  for (const finding of blockedFindings) {
    console.error(
      `${finding.scenarioId}: confidence=${finding.confidence}, humanReviewRequired=${finding.humanReviewRequired}`
    );
  }

  process.exit(1);
}

const eligibleScenarioIds =
  testBugFindings.map(
    finding => finding.scenarioId
  );

const affectedScenarios =
  testPlan.scenarios.filter(
    scenario =>
      eligibleScenarioIds.includes(scenario.id)
  );

const affectedEvidence =
  applicationContext.scenarioEvidence.filter(
    evidence =>
      eligibleScenarioIds.includes(evidence.scenarioId)
  );

//
// Evidence must still be sufficient before repair.
//

const insufficientEvidence =
  affectedEvidence.filter(
    evidence =>
      evidence.automationEvidenceSufficient !== true
  );

if (insufficientEvidence.length > 0) {
  console.error(
    'Repair blocked: application evidence is insufficient.'
  );

  process.exit(1);
}

const prompt = `
You are a senior Quality Engineering test-repair agent.

Your task is to repair ONLY generated Playwright tests that have already
been independently classified as TEST_BUG.

You are given:

- approved requirements-derived scenarios
- live application evidence collected through MCP exploration
- independent AI triage findings
- the current failing Playwright source

STRICT RULES:

1. Repair only these scenario IDs:

${JSON.stringify(eligibleScenarioIds)}

2. Do not change unrelated tests.

3. Do not add new tests.

4. Do not delete tests.

5. Do not skip or disable tests.

6. Do not use test.skip, test.fixme, test.only or similar mechanisms.

7. Do not weaken assertions merely to make a test pass.

8. Requirement meaning comes from the approved test scenario.

9. Implementation details must come from observed application evidence.

10. Do not invent:
    - selectors
    - URLs
    - messages
    - endpoints
    - status codes
    - application behaviour

11. Prefer durable observed Playwright locators.

12. Do not introduce waitForTimeout or arbitrary sleeps.

13. Do not generate API tests unless an application API was observed
    and relevant evidence exists.

14. Do not modify a test to accommodate an application defect.

15. Preserve unrelated tests and their intended assertions.

16. Return the COMPLETE repaired TypeScript source file.

17. repairedScenarioIds must contain only scenarios actually changed.

APPROVED AFFECTED SCENARIOS:

${JSON.stringify(affectedScenarios, null, 2)}

OBSERVED EVIDENCE:

${JSON.stringify(affectedEvidence, null, 2)}

TRIAGE FINDINGS:

${JSON.stringify(testBugFindings, null, 2)}

CURRENT FAILING PLAYWRIGHT SOURCE:

${testSource}
`;

console.log(
  `Repair eligible scenarios: ${eligibleScenarioIds.join(', ')}`
);

console.log(
  `Minimum confidence: ${minConfidence}%`
);

console.log(
  `Using AI provider: ${process.env.AI_PROVIDER ?? 'codex'}`
);

const result = await generateStructuredOutput({
  prompt,
  schema: repairSchema,

  approvalPolicy: 'never',
  sandbox: 'read-only'
});

//
// Validate provider output again at harness level.
//

const ajv = new Ajv({
  allErrors: true
});

const validate =
  ajv.compile(repairSchema);

if (!validate(result)) {
  console.error(
    'Repair agent returned invalid output.'
  );

  console.error(validate.errors);

  process.exit(1);
}

//
// Ensure the AI did not claim to repair an unauthorized scenario.
//

const unauthorizedRepairs =
  result.repairedScenarioIds.filter(
    id => !eligibleScenarioIds.includes(id)
  );

if (unauthorizedRepairs.length > 0) {
  console.error(
    `Repair rejected: unauthorized scenario changes: ${unauthorizedRepairs.join(', ')}`
  );

  process.exit(1);
}

const filename =
  path.basename(testSourcePath);

const candidateDirectory =
  'tests/generated/repair-candidates';

fs.mkdirSync(
  candidateDirectory,
  { recursive: true }
);

const candidatePath =
  path.join(
    candidateDirectory,
    filename
  );

fs.writeFileSync(
  candidatePath,
  result.code
);

const metadataPath =
  'reports/repair.json';

fs.writeFileSync(
  metadataPath,
  JSON.stringify(
    {
      summary: result.summary,
      repairedScenarioIds:
        result.repairedScenarioIds,
      changes: result.changes,
      candidatePath
    },
    null,
    2
  )
);

console.log('');
console.log('Repair candidate generated.');
console.log(`Candidate: ${candidatePath}`);
console.log(`Metadata: ${metadataPath}`);

for (const change of result.changes) {
  console.log(
    `${change.scenarioId}: ${change.description}`
  );
}