import fs from 'fs';

import {
  generateStructuredOutput
} from '../ai/provider.mjs';

import {
  triageSchema
} from '../schemas/triage-schema.mjs';

const failuresPath = process.argv[2];
const testPlanPath = process.argv[3];
const applicationContextPath = process.argv[4];
const testSourcePath = process.argv[5];

if (
  !failuresPath ||
  !testPlanPath ||
  !applicationContextPath ||
  !testSourcePath
) {
  console.error(
    'Usage: node src/agents/triage.mjs <failures> <test-plan> <application-context> <test-source>'
  );

  process.exit(1);
}

const failures = JSON.parse(
  fs.readFileSync(failuresPath, 'utf-8')
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
// Group the same logical failure across browsers.
// We don't want the AI independently analysing Chromium,
// Firefox and WebKit if they all failed identically.
//

const groupedFailures = Object.values(
  failures.reduce((groups, failure) => {
    const key = failure.title;

    if (!groups[key]) {
      groups[key] = {
        title: failure.title,
        browsers: [],
        errors: []
      };
    }

    groups[key].browsers.push(
      failure.browser
    );

    groups[key].errors.push(
      failure.error
    );

    return groups;
  }, {})
);

const prompt = `
You are a senior Quality Engineering failure-triage agent.

Analyse failed automated tests using:

- the approved test plan
- live application evidence collected through MCP exploration
- the generated Playwright source code
- the actual Playwright failure output

CLASSIFICATIONS:

TEST_BUG
The generated test is incorrect, for example:
- incorrect assertion
- incorrect locator
- contradiction with approved requirements
- contradiction with previously observed application evidence

APPLICATION_BUG
The test correctly represents the approved requirement and known
application evidence, but the application now violates that requirement.

ENVIRONMENT_ISSUE
The test could not execute reliably because of infrastructure,
network, browser, service availability or environment problems.

FLAKY
Evidence indicates intermittent or non-deterministic test behaviour.

UNKNOWN
Available evidence is insufficient for a reliable classification.

RULES:

1. Base the classification only on supplied evidence.

2. Do not assume the application is broken merely because a test failed.

3. Compare the generated test against both the approved requirement
   and observed application evidence.

4. If all browsers fail in the same way, consider whether this indicates
   a deterministic test or application problem rather than flakiness.

5. Do not classify something as flaky without evidence of inconsistent
   behaviour.

6. Do not modify code.

7. recommendedAction must describe what should be investigated or
   corrected, but must not silently change requirements.

8. Set humanReviewRequired = true when the evidence is ambiguous,
   the proposed fix changes intended behaviour, or confidence is low.

APPROVED TEST PLAN:

${JSON.stringify(testPlan, null, 2)}

OBSERVED APPLICATION CONTEXT:

${JSON.stringify(applicationContext, null, 2)}

GENERATED PLAYWRIGHT SOURCE:

${testSource}

FAILED TEST RESULTS:

${JSON.stringify(groupedFailures, null, 2)}
`;

console.log(
  `Triaging ${groupedFailures.length} logical failure(s)...`
);

const result = await generateStructuredOutput({
  prompt,
  schema: triageSchema,

  approvalPolicy: 'never',
  sandbox: 'read-only'
});

fs.writeFileSync(
  'reports/triage.json',
  JSON.stringify(result, null, 2)
);

console.log('');
console.log('AI triage complete.');
console.log('Output: reports/triage.json');

for (const finding of result.findings) {
  console.log(
    `${finding.scenarioId ?? 'UNKNOWN'}: ` +
    `${finding.classification} ` +
    `(${finding.confidence}%)`
  );
}