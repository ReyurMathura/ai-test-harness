import fs from 'fs';
import path from 'path';

import Ajv from 'ajv';

import {
  generateStructuredOutput
} from '../ai/provider.mjs';

const requirementPath =
  process.argv[2];

const testPlanPath =
  process.argv[3];

const apiContextPath =
  process.argv[4];

if (
  !requirementPath ||
  !testPlanPath ||
  !apiContextPath
) {
  console.error(
    'Usage: node src/agents/api-test-generator.mjs <requirement-file> <test-plan-file> <api-context-file>'
  );

  process.exit(1);
}

const requirements =
  fs.readFileSync(
    requirementPath,
    'utf-8'
  );

const testPlan =
  JSON.parse(
    fs.readFileSync(
      testPlanPath,
      'utf-8'
    )
  );

const apiContext =
  JSON.parse(
    fs.readFileSync(
      apiContextPath,
      'utf-8'
    )
  );

const approvedScenarios =
  testPlan.scenarios.filter(
    scenario =>
      scenario.automationReady === true
  );

const sufficientEvidence =
  apiContext.scenarioEvidence.filter(
    evidence =>
      evidence.automationEvidenceSufficient === true
  );

const evidenceByScenarioId =
  new Map(
    sufficientEvidence.map(
      evidence => [
        evidence.scenarioId,
        evidence
      ]
    )
  );

const generationScenarios =
  approvedScenarios.filter(
    scenario =>
      evidenceByScenarioId.has(
        scenario.id
      )
  );

if (
  generationScenarios.length === 0
) {
  console.error(
    'No API scenarios have sufficient evidence for automation.'
  );

  process.exit(1);
}

const generationEvidence =
  generationScenarios.map(
    scenario => ({
      scenario,
      evidence:
        evidenceByScenarioId.get(
          scenario.id
        )
    })
  );

const generatorOutputSchema = {
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
You are a senior Quality Engineer generating Playwright API tests.

Generate executable TypeScript tests using:

@playwright/test

Use Playwright's APIRequestContext through the built-in:

request

fixture.

Do NOT use browser pages for these API tests.

You have:

1. software requirements
2. approved automation-ready test scenarios
3. deterministic live API evidence

The API evidence was produced by real Node.js HTTP requests.

It is authoritative runtime evidence.

GENERAL RULES:

1. Generate exactly one Playwright test for every supplied scenario.

2. Every test must be independently executable.

3. Tests must not depend on execution order.

4. Do not invent:
   - endpoints
   - HTTP methods
   - query parameters
   - request headers
   - response status codes
   - response fields
   - field types
   - API behaviour

5. Use only API operations present in the supplied evidence.

6. Use the supplied API baseUrl.

7. The existing Playwright browser baseURL may point to a different
   application.

   Therefore API requests MUST use the supplied API baseUrl explicitly.

   Do not issue relative API requests that could accidentally use the
   browser application's configured baseURL.

8. For each operation, preserve:
   - observed HTTP method
   - observed path
   - observed query parameter names
   - supplied or observed query parameter values

9. Prefer building request URLs using:

   new URL(path, apiBaseUrl)

   and URLSearchParams/searchParams where query parameters are required.

10. Assert the observed successful HTTP status where it directly
    supports the scenario.

11. When validating Content-Type, assert the stable media type.

    For example, if the observed value is:

    application/json; charset=utf-8

    it is appropriate to assert that Content-Type contains:

    application/json

    Do not make a test unnecessarily dependent on charset formatting.

12. Parse JSON only when the observed Content-Type and body evidence
    support JSON.

13. Do not hard-code changing response sample values merely because
    they happened to appear during discovery.

14. Observed sampleValue is evidence that a field existed and had a
    particular type during discovery.

    It is NOT automatically a permanent expected business value.

15. Exact response values may be asserted when supported by:
    - supplied test data
    - explicit requirements
    - a deterministic relationship between the request and response

    Example:

    Requesting product ID 1 may assert:

    body.id === 1

    because the supplied test data explicitly specifies product ID 1.

16. Do not assert a discovered product title, stock level, rating,
    price, timestamp, review text, or other mutable sample value unless
    the requirement explicitly requires that exact value.

17. For response-contract testing, prefer assertions about:
    - field presence
    - arrays
    - objects
    - strings
    - numbers
    - integers
    - booleans

    using only fields observed in the supplied evidence.

18. Do not invent required fields.

19. For PA-005 or other contract-validation scenarios, select a concise
    set of useful observed core fields rather than asserting every field
    in a large response.

20. Integer evidence should be checked as:

    typeof value === 'number'
    Number.isInteger(value) === true

21. Number evidence should be checked as:

    typeof value === 'number'

22. String evidence should be checked as:

    typeof value === 'string'

23. Array evidence should be checked with:

    Array.isArray(value)

24. Object evidence should verify that the value:
    - is not null
    - has typeof 'object'
    - is not an array

25. For pagination with a supplied limit:
    verify the returned collection respects the requested limit.

    Do not require a larger result set than the API returned.

26. Search tests must use the supplied search query.

    Do not invent undocumented matching semantics such as requiring
    every title to contain the search term unless the supplied
    requirements or evidence establish that rule.

27. Use meaningful deterministic assertions.

28. Do not use:
    - waitForTimeout
    - test.skip
    - test.fixme
    - test.only

29. Do not generate UI locators.

30. Do not use page, browser, context or DOM APIs.

31. Do not call undocumented APIs.

32. Do not perform mutation operations unless the supplied scenario and
    evidence explicitly require them.

33. Test titles must begin with the scenario ID.

    Example:

    test('PA-001 - Retrieve the product list', ...)

34. Return only the required structured output.

35. generatedScenarioIds must contain every scenario for which a test
    was generated.

36. generatedScenarioIds must not contain duplicate scenario IDs.

37. Do not include Markdown code fences inside code.

SOFTWARE REQUIREMENTS:

${requirements}

API BASE URL:

${apiContext.baseUrl}

APPROVED SCENARIOS AND LIVE API EVIDENCE:

${JSON.stringify(
  generationEvidence,
  null,
  2
)}
`;

console.log(
  `Generating API tests for: ${requirementPath}`
);

console.log(
  `Approved scenarios: ${approvedScenarios.length}`
);

console.log(
  `Scenarios with sufficient evidence: ${generationScenarios.length}`
);

console.log(
  `Using AI provider: ${process.env.AI_PROVIDER ?? 'codex'}`
);

const result =
  await generateStructuredOutput({
    prompt,
    schema:
      generatorOutputSchema,
    approvalPolicy: 'never',
    sandbox: 'read-only'
  });

const ajv =
  new Ajv({
    allErrors: true
  });

const validate =
  ajv.compile(
    generatorOutputSchema
  );

if (
  !validate(
    result
  )
) {
  console.error(
    'API generator returned invalid output.'
  );

  console.error(
    validate.errors
  );

  process.exit(1);
}

const expectedScenarioIds =
  generationScenarios.map(
    scenario =>
      scenario.id
  );

const generatedScenarioIds =
  result.generatedScenarioIds;

const duplicateScenarioIds =
  generatedScenarioIds.filter(
    (
      scenarioId,
      index,
      values
    ) =>
      values.indexOf(
        scenarioId
      ) !== index
  );

if (
  duplicateScenarioIds.length >
  0
) {
  console.error(
    'API generator returned duplicate scenario IDs:'
  );

  for (
    const scenarioId
    of new Set(
      duplicateScenarioIds
    )
  ) {
    console.error(
      `- ${scenarioId}`
    );
  }

  process.exit(1);
}

const missingScenarioIds =
  expectedScenarioIds.filter(
    scenarioId =>
      !generatedScenarioIds.includes(
        scenarioId
      )
  );

const unexpectedScenarioIds =
  generatedScenarioIds.filter(
    scenarioId =>
      !expectedScenarioIds.includes(
        scenarioId
      )
  );

if (
  missingScenarioIds.length >
  0
) {
  console.error(
    'API generator failed to produce approved scenarios:'
  );

  for (
    const scenarioId
    of missingScenarioIds
  ) {
    console.error(
      `- ${scenarioId}`
    );
  }

  process.exit(1);
}

if (
  unexpectedScenarioIds.length >
  0
) {
  console.error(
    'API generator produced unapproved scenarios:'
  );

  for (
    const scenarioId
    of unexpectedScenarioIds
  ) {
    console.error(
      `- ${scenarioId}`
    );
  }

  process.exit(1);
}

const prohibitedPatterns = [
  {
    pattern:
      /\bwaitForTimeout\s*\(/,

    description:
      'waitForTimeout'
  },

  {
    pattern:
      /\btest\.skip\s*\(/,

    description:
      'test.skip'
  },

  {
    pattern:
      /\btest\.fixme\s*\(/,

    description:
      'test.fixme'
  },

  {
    pattern:
      /\btest\.only\s*\(/,

    description:
      'test.only'
  },

  {
    pattern:
      /\bpage\./,

    description:
      'page API'
  },

  {
    pattern:
      /\bgetByRole\s*\(/,

    description:
      'UI locator'
  },

  {
    pattern:
      /\bgetByText\s*\(/,

    description:
      'UI locator'
  },

  {
    pattern:
      /\blocator\s*\(/,

    description:
      'UI locator'
  }
];

for (
  const rule
  of prohibitedPatterns
) {
  if (
    rule.pattern.test(
      result.code
    )
  ) {
    console.error(
      `Generated API tests contain prohibited usage: ${rule.description}`
    );

    process.exit(1);
  }
}

if (
  !result.code.includes(
    '@playwright/test'
  )
) {
  console.error(
    'Generated API tests do not import @playwright/test.'
  );

  process.exit(1);
}

if (
  !result.code.includes(
    'request'
  )
) {
  console.error(
    'Generated API tests do not appear to use the Playwright request fixture.'
  );

  process.exit(1);
}

for (
  const scenarioId
  of expectedScenarioIds
) {
  if (
    !result.code.includes(
      scenarioId
    )
  ) {
    console.error(
      `Generated API test source does not contain scenario ID: ${scenarioId}`
    );

    process.exit(1);
  }
}

const filename =
  path.basename(
    requirementPath,
    path.extname(
      requirementPath
    )
  );

const outputPath =
  `tests/generated/${filename}.spec.ts`;

fs.mkdirSync(
  path.dirname(
    outputPath
  ),
  {
    recursive: true
  }
);

fs.writeFileSync(
  outputPath,
  result.code
);

console.log('');
console.log(
  'API tests successfully generated.'
);

console.log(
  `Output: ${outputPath}`
);

console.log(
  `Generated scenarios: ${result.generatedScenarioIds.length}`
);

for (
  const scenarioId
  of result.generatedScenarioIds
) {
  console.log(
    `- ${scenarioId}`
  );
}