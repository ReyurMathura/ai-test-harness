import fs from 'fs';
import path from 'path';
import spawn from 'cross-spawn';

const requirementPath = process.argv[2];

if (!requirementPath) {
  console.error('');
  console.error(
    'Usage: npm run qa:create-automated-tests -- <requirement-file>'
  );
  console.error('');

  process.exit(1);
}

if (!fs.existsSync(requirementPath)) {
  console.error('');
  console.error(
    `Requirement file not found: ${requirementPath}`
  );
  console.error('');

  process.exit(1);
}

const featureName =
  path.basename(
    requirementPath,
    path.extname(requirementPath)
  );

const testPlanPath =
  `generated/${featureName}-test-plan.json`;

const applicationContextPath =
  `generated/${featureName}-application-context.json`;

const generatedTestPath =
  `tests/generated/${featureName}.spec.ts`;

if (!fs.existsSync(testPlanPath)) {
  console.error('');
  console.error(
    `Test plan not found: ${testPlanPath}`
  );

  console.error('');
  console.error(
    'Create the test plan first:'
  );

  console.error('');
  console.error(
    `npm run qa:create-test-plan -- ${requirementPath}`
  );

  console.error('');

  process.exit(1);
}

if (!fs.existsSync(applicationContextPath)) {
  console.error('');
  console.error(
    `Application evidence not found: ${applicationContextPath}`
  );

  console.error('');
  console.error(
    'Discover the test locators first:'
  );

  console.error('');
  console.error(
    `npm run qa:discover-test-locators -- ${requirementPath}`
  );

  console.error('');

  process.exit(1);
}

function run(command, args) {
  console.log('');
  console.log(
    `> ${command} ${args.join(' ')}`
  );
  console.log('');

  const result = spawn.sync(
    command,
    args,
    {
      encoding: 'utf-8',
      stdio: 'inherit'
    }
  );

  if (result.error) {
    console.error('');
    console.error(
      `Failed to start ${command}: ${result.error.message}`
    );
    console.error('');

    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(
      result.status ?? 1
    );
  }
}

console.log('');
console.log('Create Automated Tests');
console.log('======================');
console.log('');

console.log(
  `Requirements:         ${requirementPath}`
);

console.log(
  `Test plan:            ${testPlanPath}`
);

console.log(
  `Application evidence: ${applicationContextPath}`
);

console.log('');
console.log(
  'This step will:'
);

console.log(
  '  1. Read the reviewed test plan.'
);

console.log(
  '  2. Read the previously discovered application evidence.'
);

console.log(
  '  3. Generate evidence-grounded Playwright tests.'
);

console.log('');
console.log(
  'This step will NOT explore the application.'
);

console.log('');
console.log(
  'This step will NOT execute the tests.'
);

console.log('');
console.log(
  'Generating Playwright automation...'
);

run(
  'node',
  [
    'src/agents/test-generator.mjs',
    testPlanPath,
    applicationContextPath
  ]
);

if (!fs.existsSync(generatedTestPath)) {
  console.error('');
  console.error(
    'Generated test file was not created.'
  );

  console.error(
    `Expected: ${generatedTestPath}`
  );

  console.error('');

  process.exit(1);
}

console.log('');
console.log(
  'Automated tests successfully created.'
);

console.log('');

console.log(
  `Generated tests: ${generatedTestPath}`
);

console.log('');
console.log(
  'The tests have NOT been executed.'
);

console.log('');
console.log(
  'Next step:'
);

console.log('');

console.log(
  `npm run qa:execute-automated-tests -- ${requirementPath}`
);

console.log('');