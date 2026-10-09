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
  fs.readFileSync(
    testPlanPath,
    'utf-8'
  )
);

const applicationContext = JSON.parse(
  fs.readFileSync(
    applicationContextPath,
    'utf-8'
  )
);


// -----------------------------------------------------------------------------
// Only generate tests that:
// 1. were approved by the planner for automation
// 2. have sufficient live application evidence
// -----------------------------------------------------------------------------


const evidenceByScenario = new Map(
  applicationContext.scenarioEvidence.map(
    evidence => [
      evidence.scenarioId,
      evidence
    ]
  )
);

const approvedScenarios =
  testPlan.scenarios
    .filter(
      scenario =>
        scenario.automationReady === true
    )
    .filter(scenario => {
      const evidence =
        evidenceByScenario.get(
          scenario.id
        );

      return (
        evidence &&
        evidence.automationEvidenceSufficient === true
      );
    })
    .map(scenario => ({
      scenario,

      evidence:
        evidenceByScenario.get(
          scenario.id
        )
    }));

if (
  approvedScenarios.length === 0
) {
  console.error(
    'No scenarios have sufficient evidence for automation.'
  );

  process.exit(1);
}


// -----------------------------------------------------------------------------
// Structured output
// -----------------------------------------------------------------------------


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


// -----------------------------------------------------------------------------
// Generator prompt
// -----------------------------------------------------------------------------


const prompt = `
You are a senior Quality Engineer specialising in Playwright and TypeScript.

Generate executable Playwright tests using the supplied approved
test scenarios and live application evidence.

The generated tests must be trustworthy, isolated, deterministic
and grounded only in the supplied requirements and observed evidence.


GENERAL RULES:

1. Generate TypeScript using @playwright/test.

2. Generate tests only for the scenarios supplied below.

3. Do not invent additional scenarios.

4. Requirement meaning comes from the approved test scenario.

5. Implementation details must come only from observed
   application evidence.

6. Do not invent:
   - selectors
   - URLs
   - API endpoints
   - page text
   - status codes
   - accessibility roles
   - application behaviour
   - setup behaviour
   - authentication behaviour


LOCATOR RULES:

7. Build UI locators ONLY from locatorEvidence.

8. Never derive a locator strategy from:
   - element name
   - prose descriptions
   - visual appearance
   - text that has no corresponding locatorEvidence
   - assumptions

9. Convert locatorEvidence to Playwright as follows:

   strategy="role"
   -> page.getByRole(role, { name, exact })

   strategy="label"
   -> page.getByLabel(value, { exact })

   strategy="placeholder"
   -> page.getByPlaceholder(value, { exact })

   strategy="text"
   -> page.getByText(value, { exact })

   strategy="attribute"
   -> page.locator('[ATTRIBUTE="VALUE"]')

10. Do not use page.getByTestId() unless the evidence contract
    explicitly provides Playwright test-id semantics.

    An observed attribute such as:

    data-test="error"

    is NOT equivalent to:

    data-testid="error"

11. Locator uniqueness and scenario specificity take precedence over
    general semantic preference.

12. Prefer a locator that uniquely identifies the exact element required
    by the scenario.

13. A role, label, placeholder or text locator must NOT be preferred if
    it may match multiple elements and a more specific observed locator
    exists.

14. For repeated controls such as:
    - Add to cart
    - Remove
    - Edit
    - Delete
    - View
    - Select

    prefer a uniquely observed attribute locator when that attribute
    identifies the intended business object.

15. Example:

    If the supplied evidence contains:

    role="button"
    name="Add to cart"

    and:

    attribute="data-test"
    value="add-to-cart-sauce-labs-backpack"

    use:

    page.locator(
      '[data-test="add-to-cart-sauce-labs-backpack"]'
    )

    because that evidence identifies the exact intended product.

16. Semantic locators are preferred when they uniquely identify the
    intended element.

17. If there is insufficient evidence to determine which of several
    matching elements is the intended scenario target, do not guess.

18. Do not upgrade visible text into an accessibility role.

    For example:

    observed text "Products"

    must NOT become:

    getByRole('heading', { name: 'Products' })

    unless role="heading" is explicitly present in locatorEvidence.


PRECONDITION AND STATE RULES:

19. Every generated test must be independently executable.

20. Every test must establish all executable preconditions required
    by its scenario before performing the scenario steps.

21. Preconditions are not documentation only.

    If a precondition represents application state required by the
    scenario, that state must exist before the scenario behaviour
    is exercised.

22. Never rely on state created by another test.

23. Never assume tests run:
    - sequentially
    - in source-code order
    - in the same browser context
    - using state created by another scenario

24. Tests must be safe to execute:
    - individually
    - in parallel
    - in any order

25. If a scenario requires authentication, establish authentication
    within that test unless an explicitly supplied fixture or storage
    state guarantees authentication.

26. Authentication setup may only use observed application evidence.

    Do not invent login controls, credentials, URLs or authentication
    behaviour.

27. If a scenario requires prior state such as:
    - a product already being in a shopping cart
    - an existing record
    - a selected item
    - a configured setting
    - a created entity
    - a previously completed action

    the generated test must establish that state itself or use an
    explicitly supplied fixture that guarantees it.

28. If a scenario says:

    "The cart contains an added product"

    the test must not simply open the cart and assume the product is
    present.

    It must first establish the required product-in-cart state using
    evidence-backed actions.

29. If the available application evidence does not show how to establish
    a required executable precondition, DO NOT guess how to do it.

30. A scenario must not rely on another generated scenario as setup.

31. Shared helper functions are allowed for repeated setup such as
    authentication, provided every action inside the helper is directly
    supported by observed evidence.

32. Shared helpers must not create hidden cross-test state.

33. Each test should begin from a known independent state wherever
    practical.

34. When application evidence contains an observable way to verify that
    an important setup action succeeded, verify that setup before moving
    to the scenario behaviour.

35. For example, after authentication, if an observed URL or visible
    application element proves successful login, the generated setup may
    assert that state before continuing.

36. Do not invent setup assertions merely because verification would be
    convenient.

    Setup verification must also be supported by observed evidence.


ASSERTION RULES:

37. Every generated test must contain at least one meaningful,
    deterministic assertion.

38. Assertions must prove the approved expected result.

39. Assertions may use only observed:
    - URLs
    - visible text
    - accessibility evidence
    - attributes
    - application state

40. Do not weaken an assertion merely to make a test pass.

41. Do not use arbitrary sleeps such as:

    page.waitForTimeout(...)

42. Do not use locator.isVisible() as an assertion.

    This:

    await locator.isVisible()

    only returns a boolean.

    If visibility is part of the test expectation, use:

    await expect(locator).toBeVisible()

43. For absence checks, use deterministic Playwright assertions such as:

    await expect(locator).not.toBeVisible()

    or another evidence-supported assertion appropriate to the
    observed application behaviour.

44. When multiple approved scenarios represent distinct requirements,
    do not collapse them into identical tests merely because one
    observable state could loosely satisfy both scenarios.

45. Select the assertion that most directly proves each scenario's own
    expectedResult when the supplied evidence supports such a distinction.

46. Example:

    If one scenario proves:

    "The product is added to the shopping cart"

    and another proves:

    "The cart indicates that it contains the product"

    use different observed evidence for those assertions when available.

    For example, the first may be proven by a product-specific control
    changing state, while the second may be proven by the cart indication.

47. Do not invent a distinct assertion merely to make scenarios look
    different.

    Scenario-specific assertions must still come from supplied evidence.


API AND NETWORK RULES:

48. Do not generate API tests unless an application API was actually
    observed and is relevant to the approved scenario.

49. Do not treat analytics or telemetry endpoints as application APIs.

50. Do not infer an API from a UI action merely because an API might
    normally exist.


TEST QUALITY RULES:

51. Include the scenario ID in every generated test title.

52. Generate complete executable TypeScript.

53. Import test and expect from @playwright/test.

54. Use the configured Playwright baseURL where possible.

55. Do not use test.skip, test.fixme or test.only.

56. Do not silently change the intended requirement.

57. Do not introduce dependencies between generated tests.

58. Before generating each test:

    a. Read the scenario preconditions.
    b. Determine which preconditions require executable setup.
    c. Confirm supplied evidence exists for that setup.
    d. Establish the setup.
    e. Verify important setup state when supported by evidence.
    f. Perform the scenario steps.
    g. Select the evidence that most directly proves the expected result.
    h. Assert the approved expected result.

59. If the same setup is repeated across scenarios, you may create a
    helper function to reduce duplication, but only when the helper is
    entirely evidence-backed.

60. When generating shared Playwright helper functions that accept
    a page, import and use the Page type from @playwright/test.

    Example:

    import { test, expect, type Page } from '@playwright/test';

    function login(page: Page) {
      ...
    }

    Do not derive the Page type using Parameters<typeof test>
    or other indirect type expressions.

61. Test data must come from the approved scenario.

    Do not replace supplied concrete test data with a newly invented
    value.

62. Runtime test data discovered during application exploration may be
    used when the approved scenario explicitly permits discovery-based
    test data.

63. When runtime data has been discovered, use the evidence associated
    with that actual discovered object.

    For example, if exploration selected "Sauce Labs Backpack", use the
    product-specific evidence collected for that product rather than a
    generic control that could operate on another product.


APPROVED SCENARIOS WITH LIVE EVIDENCE:

${JSON.stringify(
  approvedScenarios,
  null,
  2
)}
`;


// -----------------------------------------------------------------------------
// Generate
// -----------------------------------------------------------------------------


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

const result =
  await generateStructuredOutput({
    prompt,
    schema: generatorSchema,

    approvalPolicy: 'never',
    sandbox: 'read-only'
  });


// -----------------------------------------------------------------------------
// Deterministic output checks
// -----------------------------------------------------------------------------


const approvedScenarioIds =
  approvedScenarios.map(
    item =>
      item.scenario.id
  );

const generatedScenarioIds =
  result.generatedScenarioIds;

const duplicateGeneratedScenarioIds =
  generatedScenarioIds.filter(
    (id, index) =>
      generatedScenarioIds.indexOf(id) !== index
  );

if (
  duplicateGeneratedScenarioIds.length > 0
) {
  console.error(
    'Generator returned duplicate scenario IDs:'
  );

  for (
    const id of new Set(
      duplicateGeneratedScenarioIds
    )
  ) {
    console.error(
      `- ${id}`
    );
  }

  process.exit(1);
}

const unexpectedScenarioIds =
  generatedScenarioIds.filter(
    id =>
      !approvedScenarioIds.includes(id)
  );

if (
  unexpectedScenarioIds.length > 0
) {
  console.error(
    'Generated output contains unauthorised scenarios:'
  );

  for (
    const id of unexpectedScenarioIds
  ) {
    console.error(
      `- ${id}`
    );
  }

  process.exit(1);
}

const missingScenarioIds =
  approvedScenarioIds.filter(
    id =>
      !generatedScenarioIds.includes(id)
  );

if (
  missingScenarioIds.length > 0
) {
  console.error(
    'Generator failed to produce approved scenarios:'
  );

  for (
    const id of missingScenarioIds
  ) {
    console.error(
      `- ${id}`
    );
  }

  process.exit(1);
}


// -----------------------------------------------------------------------------
// Basic generated-code policy checks
// -----------------------------------------------------------------------------


const forbiddenPatterns = [
  {
    pattern: /\.waitForTimeout\s*\(/,
    message:
      'Generated tests contain page.waitForTimeout(), which is not allowed.'
  },

  {
    pattern: /\btest\.skip\s*\(/,
    message:
      'Generated tests contain test.skip(), which is not allowed.'
  },

  {
    pattern: /\btest\.fixme\s*\(/,
    message:
      'Generated tests contain test.fixme(), which is not allowed.'
  },

  {
    pattern: /\btest\.only\s*\(/,
    message:
      'Generated tests contain test.only(), which is not allowed.'
  },

  {
    pattern: /\.getByTestId\s*\(/,
    message:
      'Generated tests contain getByTestId(), which is not supported by the current evidence contract.'
  }
];

for (
  const {
    pattern,
    message
  } of forbiddenPatterns
) {
  if (
    pattern.test(
      result.code
    )
  ) {
    console.error(
      message
    );

    process.exit(1);
  }
}


// -----------------------------------------------------------------------------
// Write generated test file
// -----------------------------------------------------------------------------


const filename =
  path.basename(
    testPlanPath,
    '-test-plan.json'
  );

const outputPath =
  `tests/generated/${filename}.spec.ts`;

fs.mkdirSync(
  path.dirname(outputPath),
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
  'Playwright tests generated.'
);

console.log(
  `Output: ${outputPath}`
);

console.log(
  `Scenarios generated: ${result.generatedScenarioIds.join(', ')}`
);