import fs from 'fs';
import path from 'path';
import Ajv from 'ajv';

import { testPlanSchema } from '../schemas/test-plan-schema.mjs';
import { generateStructuredOutput } from '../ai/provider.mjs';

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

4. Prioritise scenarios based on business and technical risk.

5. Include positive and negative testing where justified.

6. Include boundary, security, validation and usability scenarios only when appropriate.

7. Keep scenarios specific enough that another AI agent could later generate executable automated tests from them.

8. Do not generate Playwright code yet.

9. Do not return commentary outside the required JSON structure.

10. Never invent exact error messages, field limits,
    UI controls, business rules or application behaviour
    that are not present in the supplied requirements.

11. expectedResult must describe only behaviour supported
    by the supplied requirements.

12. Put any unsupported assumptions into the assumptions array.

13. Set automationReady = false when required information
    is missing or would need application exploration.

14. evidence must state the exact acceptance criterion,
    requirement, or quality expectation that justified
    the scenario.

15. Exploratory testing must investigate unknown behaviour,
    not pretend that unknown behaviour already exists.

16. Do not assume that validation failures display an error
    message unless the requirement explicitly states that an
    error message must be displayed.

17. expectedResult must be deterministic and testable.
    Do not use uncertain wording such as "may", "might",
    "could", "if implemented", or similar phrases.

18. Exploratory scenarios that investigate unknown behaviour
    should describe the investigation objective rather than
    asserting an unknown expected outcome.

19. Avoid weak or irrelevant scenarios. For example,
    password complexity is generally not a login concern
    unless the supplied requirements explicitly state otherwise.

20. If a scenario requires subjective human judgement,
    set automationReady = false.

SOFTWARE REQUIREMENTS:

${requirements}
`;

console.log(`Planning tests from: ${requirementPath}`);
console.log(  `Using AI provider: ${process.env.AI_PROVIDER ?? 'codex'}`);

const testPlan = await generateStructuredOutput({
  prompt,
  schema: testPlanSchema
});

const ajv = new Ajv({
  allErrors: true
});

const validate = ajv.compile(testPlanSchema);

const valid = validate(testPlan);

if (!valid) {
  console.error('AI returned an invalid test plan.');
  console.error(validate.errors);

  process.exit(1);
}

const filename =
  path.basename(requirementPath, path.extname(requirementPath));

const outputPath =
  `generated/${filename}-test-plan.json`;

fs.writeFileSync(
  outputPath,
  JSON.stringify(testPlan, null, 2)
);

console.log('');
console.log('Test plan successfully generated.');
console.log(`Output: ${outputPath}`);
console.log(`Scenarios: ${testPlan.scenarios.length}`);