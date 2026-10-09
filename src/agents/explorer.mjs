import fs from 'fs';
import path from 'path';
import Ajv from 'ajv';

import {
  applicationContextSchema
} from '../schemas/application-context-schema.mjs';

import {
  generateStructuredOutput
} from '../ai/provider.mjs';


const requirementPath =
  process.argv[2];

const testPlanPath =
  process.argv[3];


if (
  !requirementPath ||
  !testPlanPath
) {
  console.error(
    'Usage: node src/agents/explorer.mjs <requirement-file> <test-plan-file>'
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


const automationScenarios =
  testPlan.scenarios.filter(
    scenario =>
      scenario.automationReady === true
  );


// -----------------------------------------------------------------------------
// Deterministic locator normalisation
//
// AI reports browser observations.
// Node turns those raw observations into our canonical locatorEvidence.
//
// We deliberately do NOT trust AI-generated locatorEvidence.
// -----------------------------------------------------------------------------


function isNonEmptyString(
  value
) {
  return (
    typeof value === 'string' &&
    value.trim().length > 0
  );
}


function addUniqueLocator(
  locators,
  locator
) {
  const serialised =
    JSON.stringify(
      locator
    );


  const exists =
    locators.some(
      existing =>
        JSON.stringify(
          existing
        ) === serialised
    );


  if (!exists) {
    locators.push(
      locator
    );
  }
}


function isUsefulAttribute(
  attributeName
) {
  if (
    !isNonEmptyString(
      attributeName
    )
  ) {
    return false;
  }


  const name =
    attributeName
      .trim()
      .toLowerCase();


  return (
    name === 'id' ||
    name === 'name' ||
    name === 'aria-label' ||
    name.startsWith(
      'data-'
    )
  );
}


function buildLocatorEvidence(
  element
) {
  const locators = [];


  // ---------------------------------------------------------------------------
  // Accessible role + accessible name
  // ---------------------------------------------------------------------------


  if (
    isNonEmptyString(
      element.role
    ) &&
    isNonEmptyString(
      element.accessibleName
    )
  ) {
    addUniqueLocator(
      locators,
      {
        strategy:
          'role',

        role:
          element.role,

        name:
          element.accessibleName,

        attribute:
          null,

        value:
          null,

        exact:
          true
      }
    );
  }


  // ---------------------------------------------------------------------------
  // Placeholder
  // ---------------------------------------------------------------------------


  if (
    isNonEmptyString(
      element.placeholder
    )
  ) {
    addUniqueLocator(
      locators,
      {
        strategy:
          'placeholder',

        role:
          null,

        name:
          null,

        attribute:
          null,

        value:
          element.placeholder,

        exact:
          true
      }
    );
  }


  // ---------------------------------------------------------------------------
  // Stable observed attributes
  //
  // Intentionally exclude class, style, role, type, etc.
  // ---------------------------------------------------------------------------


  for (
    const attribute of
      element.attributes ?? []
  ) {
    if (
      !isUsefulAttribute(
        attribute.name
      )
    ) {
      continue;
    }


    if (
      !isNonEmptyString(
        attribute.value
      )
    ) {
      continue;
    }


    addUniqueLocator(
      locators,
      {
        strategy:
          'attribute',

        role:
          null,

        name:
          null,

        attribute:
          attribute.name,

        value:
          attribute.value,

        exact:
          true
      }
    );
  }


  // ---------------------------------------------------------------------------
  // Visible text
  //
  // Never use the current value of an input as a text locator.
  // ---------------------------------------------------------------------------


  if (
    element.kind !== 'input' &&
    isNonEmptyString(
      element.text
    )
  ) {
    addUniqueLocator(
      locators,
      {
        strategy:
          'text',

        role:
          null,

        name:
          null,

        attribute:
          null,

        value:
          element.text,

        exact:
          true
      }
    );
  }


  return locators;
}


function normaliseElement(
  element
) {
  return {
    ...element,

    // Never preserve a password value as visible evidence.
    text:
      element.inputType ===
      'password'
        ? null
        : element.text,

    // Completely rebuild this from observed facts.
    // Ignore whatever locatorEvidence the AI returned.
    locatorEvidence:
      buildLocatorEvidence(
        element
      )
  };
}


function normaliseApplicationContext(
  context
) {
  return {
    ...context,

    scenarioEvidence:
      context.scenarioEvidence.map(
        scenario => ({
          ...scenario,

          ui: {
            ...scenario.ui,

            elements:
              scenario.ui.elements.map(
                normaliseElement
              )
          }
        })
      )
  };
}


// -----------------------------------------------------------------------------
// Explorer prompt
// -----------------------------------------------------------------------------


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

15. For every important interactive element, record useful observed
    HTML attributes where available, especially:

    - data-* attributes
    - id
    - name
    - aria-label

16. When multiple controls have the same accessible name or visible text,
    inspect and record a stable distinguishing attribute when one exists.

    For example, if several controls are named "Add to cart", preserve a
    product-specific observed data-* or id attribute when available.

17. locatorEvidence is not treated as authoritative by the harness.

    The harness will rebuild locatorEvidence deterministically from the
    raw element observations.

    Therefore prioritise accurate raw facts:

    - role
    - accessibleName
    - text
    - placeholder
    - inputType
    - attributes

18. Evidence for each automation-ready scenario must include enough
    observed information to reproduce all executable preconditions.

    If authentication is a precondition, observe and record the login
    controls and successful authentication behaviour.

    If product-in-cart state is a precondition, observe and record the
    controls required to establish that state.

    Do not mark automationEvidenceSufficient = true unless another
    component can reproduce the scenario from a fresh browser session
    using only the recorded evidence and supplied test data.

19. Shared setup evidence may be reused while exploring the application,
    but include the relevant observed setup controls in the scenario
    evidence that requires them.

20. For every state-changing interaction required to establish a
    precondition or perform a scenario action, record BOTH:

    - the control used BEFORE the interaction, including its observed
      locator evidence
    - the resulting application state AFTER the interaction

21. Do not replace the original action control with only its
    post-interaction form.

    Example:

    Before:
    "Add to cart"
    data-test="add-to-cart-sauce-labs-backpack"

    After:
    "Remove"
    data-test="remove-sauce-labs-backpack"

    Both are useful evidence and must be preserved.

22. A scenario must not be marked automationEvidenceSufficient=true
    unless the recorded evidence contains the controls needed to
    recreate its executable setup from a fresh browser session.

SOFTWARE REQUIREMENTS:

${requirements}

APPROVED AUTOMATION-READY TEST SCENARIOS:

${JSON.stringify(
  automationScenarios,
  null,
  2
)}
`;


// -----------------------------------------------------------------------------
// Explore
// -----------------------------------------------------------------------------


console.log(
  `Exploring application for: ${requirementPath}`
);


console.log(
  `Automation-ready scenarios: ${automationScenarios.length}`
);


console.log(
  `Using AI provider: ${process.env.AI_PROVIDER ?? 'codex'}`
);


const rawContext =
  await generateStructuredOutput({
    prompt,

    schema:
      applicationContextSchema,

    approvalPolicy:
      'on-request',

    sandbox:
      'read-only',

    autoReview:
      true
  });


// -----------------------------------------------------------------------------
// Normalise AI output
// -----------------------------------------------------------------------------


const context =
  normaliseApplicationContext(
    rawContext
  );


// -----------------------------------------------------------------------------
// Validate canonical output
// -----------------------------------------------------------------------------


const ajv =
  new Ajv({
    allErrors: true
  });


const validate =
  ajv.compile(
    applicationContextSchema
  );


if (
  !validate(
    context
  )
) {
  console.error(
    'Explorer returned invalid application context.'
  );


  console.error(
    validate.errors
  );


  process.exit(1);
}


// -----------------------------------------------------------------------------
// Save
// -----------------------------------------------------------------------------


const filename =
  path.basename(
    requirementPath,
    path.extname(
      requirementPath
    )
  );


const outputPath =
  `generated/${filename}-application-context.json`;


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
  JSON.stringify(
    context,
    null,
    2
  )
);


// -----------------------------------------------------------------------------
// Summary
// -----------------------------------------------------------------------------


const sufficientScenarios =
  context.scenarioEvidence.filter(
    evidence =>
      evidence
        .automationEvidenceSufficient ===
      true
  );


const insufficientScenarios =
  context.scenarioEvidence.filter(
    evidence =>
      evidence
        .automationEvidenceSufficient ===
      false
  );


console.log('');
console.log(
  'Application exploration complete.'
);


console.log(
  `Output: ${outputPath}`
);


console.log(
  `Scenario evidence records: ${context.scenarioEvidence.length}`
);


console.log(
  `Automation evidence sufficient: ${sufficientScenarios.length}`
);


console.log(
  `Automation evidence insufficient: ${insufficientScenarios.length}`
);


if (
  insufficientScenarios.length > 0
) {
  console.log('');
  console.log(
    'Scenarios still requiring evidence:'
  );


  for (
    const evidence of
      insufficientScenarios
  ) {
    console.log(
      `  ${evidence.scenarioId}`
    );


    for (
      const reason of
        evidence.missingEvidence
    ) {
      console.log(
        `    - ${reason}`
      );
    }
  }
}