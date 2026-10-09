import fs from 'fs';
import path from 'path';
import spawn from 'cross-spawn';

const requirementPath = process.argv[2];

if (!requirementPath) {
  console.error('');
  console.error(
    'Usage: npm run qa:discover-test-locators -- <requirement-file>'
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

if (!fs.existsSync(testPlanPath)) {
  console.error('');
  console.error(
    `Test plan not found: ${testPlanPath}`
  );

  console.error('');
  console.error(
    'Create and review the test plan first:'
  );

  console.error('');
  console.error(
    `npm run qa:create-test-plan -- ${requirementPath}`
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
console.log('Discover Test Locators');
console.log('======================');
console.log('');

console.log(
  `Requirements: ${requirementPath}`
);

console.log(
  `Test plan:    ${testPlanPath}`
);

console.log('');
console.log(
  'This step will inspect the live application.'
);

console.log('');
console.log(
  'It will:'
);

console.log(
  '  1. Establish the required scenario preconditions.'
);

console.log(
  '  2. Discover real controls and locator evidence.'
);

console.log(
  '  3. Observe relevant URLs and application state changes.'
);

console.log(
  '  4. Collect evidence needed to reproduce each automated scenario.'
);

console.log(
  '  5. Observe relevant network behaviour where useful.'
);

console.log('');
console.log(
  'This step will NOT generate Playwright test code.'
);

console.log('');
console.log(
  'This step will NOT execute automated tests.'
);

console.log('');
console.log(
  'Exploring the application...'
);

run(
  'node',
  [
    'src/agents/explorer.mjs',
    requirementPath,
    testPlanPath
  ]
);

if (!fs.existsSync(applicationContextPath)) {
  console.error('');
  console.error(
    'Application evidence was not created.'
  );

  console.error(
    `Expected: ${applicationContextPath}`
  );

  console.error('');

  process.exit(1);
}

console.log('');
console.log(
  'Test locator discovery complete.'
);

console.log('');

console.log(
  `Application evidence: ${applicationContextPath}`
);

console.log('');
console.log(
  'You can review this file before generating automation.'
);

console.log('');
console.log(
  'Next step:'
);

console.log('');

console.log(
  `npm run qa:create-automated-tests -- ${requirementPath}`
);

console.log('');