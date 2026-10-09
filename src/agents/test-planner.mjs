import fs from 'fs';
import path from 'path';
import Ajv from 'ajv';

import {
  testPlanSchema
} from '../schemas/test-plan-schema.mjs';

import {
  generateStructuredOutput
} from '../ai/provider.mjs';

const requirementPath = process.argv[2];

if (!requirementPath) {
  console.error(
    'Usage: node src/agents/test-planner.mjs <requirement-file>'
  );

  process.exit(1);
}

const requirements = fs.readFileSync(
  requirementPath,
  'utf-8'
);

const prompt = `
You are a senior Quality Engineering Test Planner.

Your job is to analyse software requirements and produce a risk-based test plan.

RULES:

1. Do not invent requirements.

2. Tests directly supported by the supplied requirement must use:
   source = "requirement"

3. Additional useful tests that are not explicitly required must use:
   source = "exploratory"

4. Do not combine multiple acceptance criteria into a new
   requirement-derived scenario unless the supplied requirements
   explicitly describe the combined behaviour.

5. If a scenario combines independently specified behaviours,
   treat it as exploratory unless the combined outcome is explicitly
   required by the supplied requirements.

6. Prioritise scenarios based on business and technical risk.

7. Include positive and negative testing where justified.

8. Include boundary, security, validation and usability scenarios only
   when appropriate.

9. Keep scenarios specific enough that another AI agent could later
   generate executable automated tests from them.

10. Do not generate Playwright code yet.

11. Do not return commentary outside the required JSON structure.

12. Never invent exact error messages, field limits,
    UI controls, business rules or application behaviour
    that are not present in the supplied requirements.

13. expectedResult must describe only behaviour supported
    by the supplied requirements.

14. Put any unsupported assumptions into the assumptions array.

15. automationReady describes whether the scenario is sufficiently
    defined from a test-design perspective to proceed to live application
    exploration and automation generation.

    Do NOT set automationReady = false merely because selectors,
    URLs, controls, runtime application data or implementation details
    still need to be discovered from the live application.

16. Set automationReady = false when the scenario itself cannot be
    executed deterministically without inventing unsupported:
    - business behaviour
    - business rules
    - required test data
    - expected outcomes

17. evidence must state the exact acceptance criterion,
    requirement, or quality expectation that justified
    the scenario.

18. Exploratory testing must investigate unknown behaviour,
    not pretend that unknown behaviour already exists.

19. Do not assume that validation failures display an error
    message unless the requirement explicitly states that an
    error message must be displayed.

20. expectedResult must be deterministic and testable.

    Do not use uncertain wording such as:
    - "may"
    - "might"
    - "could"
    - "if implemented"

    for requirement-derived expected results.

21. Exploratory scenarios that investigate unknown behaviour
    should describe the investigation objective rather than
    asserting an unknown expected outcome.

22. Avoid weak or irrelevant scenarios.

    For example, password complexity is generally not a login
    concern unless the supplied requirements explicitly state
    otherwise.

23. If a scenario requires subjective human judgement,
    set automationReady = false.

24. Do not convert a quality consideration into a hard product
    requirement unless the supplied requirements explicitly define
    the expected behaviour.

25. Quality expectations such as:
    - security considerations
    - usability considerations
    - cross-browser considerations
    - boundary considerations

    may justify exploratory scenarios, but they do not automatically
    define deterministic acceptance criteria.

26. Do not create duplicate scenarios that test materially the same
    requirement unless they represent a distinct risk or behaviour.

27. Each requirement-derived scenario must be traceable to a specific
    supplied acceptance criterion or explicit requirement.

28. If a scenario cannot be traced directly to a specific supplied
    requirement, it must use:
    source = "exploratory"

29. Do not infer combined behaviour merely because two separate
    requirements exist.

    Example:

    If the requirements state:
    - username is mandatory
    - password is mandatory

    a test where both username and password are empty is not
    automatically a new requirement-derived scenario unless the
    combined behaviour is explicitly required.

    That combined case may still be useful as exploratory coverage.

30. Test data must come from:
    - supplied requirements
    - explicitly supplied test data
    - safe representative values
    - explicitly allowed runtime/discovery data
    - clearly marked assumptions

31. Do not invent application-specific users, products, records,
    identifiers or business data.

32. Keep the test plan focused on behaviour and risk.

    Do not include implementation details such as:
    - CSS selectors
    - DOM structure
    - Playwright locator syntax
    - internal code structure
    - unobserved APIs

33. Requirement-derived expected results must state the business outcome,
    not an invented implementation detail.

    Example:

    Prefer:
    "The user cannot log in."

    Do not invent:
    "A red error banner saying 'Invalid password' is displayed."

34. When a requirement says an action is possible, test the observable
    business outcome of that action.

35. When a requirement says an action is prohibited or rejected, test
    that the prohibited outcome does not occur.

36. Do not assume a specific navigation URL, page heading, button label,
    message text or visual indication unless it is supplied in the
    requirements.

37. Keep assumptions minimal.

    Do not use assumptions to disguise invented requirements.

38. If the supplied requirements already define a test user or test
    credential, use it exactly as supplied.

39. If invalid test data is required but no exact invalid value is
    supplied, choose a safe concrete non-domain-specific value when
    the scenario remains logically valid regardless of the exact value.

    Example:

    password = "invalid_password"

40. When choosing representative test data, document the choice in the
    assumptions array.

    Example:

    "invalid_password is a representative value different from the
    supplied valid password."

41. Do not mark a scenario as requirement-derived merely because it is
    common industry practice.

42. Do not mark a scenario as requirement-derived merely because it is
    good QA practice.

43. The supplied requirements are the source of truth for requirement
    coverage.

44. Exploratory scenarios should complement the requirements without
    silently expanding them.

45. Return a concise, risk-based plan rather than generating every
    theoretically possible combination.


AUTOMATION AND TEST DATA RULES:

46. If automationReady = true, test data required to execute the scenario
    must be either:

    a. a concrete value supplied by the requirements or safely selected
       during planning, or

    b. explicitly defined runtime/discovery data that can be selected
       deterministically from the live application.

47. Do not use vague descriptive placeholders for automation-ready
    scenarios such as:

    - "some invalid value"
    - "sample data"
    - "a suitable user"
    - "some product"
    - "an arbitrary record"

48. Static representative values must be concrete.

    Example:

    Prefer:
    password = "invalid_password"

    Do not use:
    password = "representative invalid password"

49. Runtime/discovery test data is allowed when the requirement explicitly
    permits any suitable currently available value.

    Examples:

    - "Any product currently available in the inventory"
    - "The first available result"
    - "Any active record matching the requirement"

50. Runtime/discovery test data must clearly state how the value should
    be obtained.

    Example:

    product =
    "Any product currently available in the product inventory;
    discover during application exploration."

51. Do not invent a specific runtime business object when the requirement
    permits discovery.

    For example, if the requirement says any available product may be
    used, do not invent a product name during planning.

52. A scenario may have automationReady = true even when a product,
    record, control, locator or URL must still be discovered from the
    live application.

53. The purpose of later application exploration is to discover:
    - real controls
    - locator evidence
    - observed URLs
    - observable application behaviour
    - allowed runtime test data
    - setup evidence needed to satisfy scenario preconditions

54. Do not set automationReady = false merely because live application
    exploration is required.

55. Set automationReady = false when choosing the required test data or
    defining the expected outcome would require unsupported business
    assumptions.

56. Requirement-derived scenarios with deterministic expected outcomes
    should normally be automationReady = true when all remaining unknowns
    are implementation details or explicitly allowed runtime discovery.

57. Exploratory scenarios should generally have automationReady = false
    when their purpose is to discover or evaluate unknown behaviour.

58. automationReady does NOT mean:
    - selectors have already been discovered
    - URLs have already been discovered
    - page controls have already been discovered
    - runtime application data has already been selected

    It means the scenario is sufficiently defined to proceed to the
    application discovery stage.

SOFTWARE REQUIREMENTS:

${requirements}
`;

console.log(
  `Planning tests from: ${requirementPath}`
);

console.log(
  `Using AI provider: ${process.env.AI_PROVIDER ?? 'codex'}`
);

const testPlan =
  await generateStructuredOutput({
    prompt,
    schema: testPlanSchema
  });

const ajv = new Ajv({
  allErrors: true
});

const validate =
  ajv.compile(
    testPlanSchema
  );

const valid =
  validate(
    testPlan
  );

if (!valid) {
  console.error(
    'AI returned an invalid test plan.'
  );

  console.error(
    validate.errors
  );

  process.exit(1);
}

const filename =
  path.basename(
    requirementPath,
    path.extname(requirementPath)
  );

const outputPath =
  `generated/${filename}-test-plan.json`;

fs.mkdirSync(
  path.dirname(outputPath),
  {
    recursive: true
  }
);

fs.writeFileSync(
  outputPath,
  JSON.stringify(
    testPlan,
    null,
    2
  )
);

console.log('');
console.log(
  'Test plan successfully generated.'
);

console.log(
  `Output: ${outputPath}`
);

console.log(
  `Scenarios: ${testPlan.scenarios.length}`
);