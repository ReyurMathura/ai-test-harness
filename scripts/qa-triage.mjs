import fs from 'fs';
import path from 'path';
import spawn from 'cross-spawn';

const requirementPath = process.argv[2];

if (!requirementPath) {
  console.error('');
  console.error(
    'Usage: npm run qa:triage-test-failures -- <requirement-file>'
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

const testPath =
  `tests/generated/${featureName}.spec.ts`;

const resultsPath =
  'reports/results.json';

const failuresPath =
  'reports/failures.json';

const triagePath =
  'reports/triage.json';

const requiredFiles = [
  testPlanPath,
  applicationContextPath,
  testPath,
  resultsPath
];

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) {
    console.error('');
    console.error(
      'Cannot triage test failures.'
    );

    console.error(
      `Required file is missing: ${file}`
    );

    console.error('');
    console.error(
      'Execute the automated tests first:'
    );

    console.error('');

    console.error(
      `npm run qa:execute-automated-tests -- ${requirementPath}`
    );

    console.error('');

    process.exit(1);
  }
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
console.log('Triage Test Failures');
console.log('====================');
console.log('');

console.log(
  'This step will analyse failed automated tests.'
);

console.log('');

console.log(
  'It will:'
);

console.log(
  '  1. Extract the failed Playwright results.'
);

console.log(
  '  2. Compare failures with the test plan.'
);

console.log(
  '  3. Compare failures with previously collected application evidence.'
);

console.log(
  '  4. Compare failures with the generated test implementation.'
);

console.log(
  '  5. Classify each logical failure.'
);

console.log('');

console.log(
  'Possible classifications:'
);

console.log(
  '  APPLICATION_BUG'
);

console.log(
  '  TEST_BUG'
);

console.log(
  '  ENVIRONMENT_ISSUE'
);

console.log(
  '  FLAKY'
);

console.log(
  '  UNKNOWN'
);

console.log('');
console.log(
  'This step will NOT modify or repair any tests.'
);


// ----------------------------------------
// Extract failures
// ----------------------------------------

console.log('');
console.log(
  '1. Extracting failed test results...'
);

run(
  'node',
  [
    'scripts/extract-failures.mjs'
  ]
);

if (!fs.existsSync(failuresPath)) {
  console.error('');
  console.error(
    `Failure report was not created: ${failuresPath}`
  );

  console.error('');

  process.exit(1);
}


// ----------------------------------------
// Triage
// ----------------------------------------

console.log('');
console.log(
  '2. Analysing and classifying failures...'
);

run(
  'node',
  [
    'src/agents/triage.mjs',
    failuresPath,
    testPlanPath,
    applicationContextPath,
    testPath
  ]
);


// ----------------------------------------
// Complete
// ----------------------------------------

console.log('');
console.log(
  'Failure triage complete.'
);

console.log('');

console.log(
  `Triage report: ${triagePath}`
);

console.log('');
console.log(
  'Review the triage report before attempting any repair.'
);

console.log('');
console.log(
  'If eligible failures are classified as TEST_BUG, the next step is:'
);

console.log('');

console.log(
  `npm run qa:repair-test-automation -- ${requirementPath}`
);

console.log('');