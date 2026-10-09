import fs from 'fs';
import path from 'path';
import spawn from 'cross-spawn';

const requirementPath = process.argv[2];

if (!requirementPath) {
  console.error('');
  console.error(
    'Usage: npm run qa:execute-automated-tests -- <requirement-file>'
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

const generatedTestPath =
  `tests/generated/${featureName}.spec.ts`;

if (!fs.existsSync(generatedTestPath)) {
  console.error('');
  console.error(
    `Generated automated tests not found: ${generatedTestPath}`
  );

  console.error('');
  console.error(
    'Create the automated tests first:'
  );

  console.error('');

  console.error(
    `npm run qa:create-automated-tests -- ${requirementPath}`
  );

  console.error('');
  console.error(
    `npm run qa:generate-automated-tests -- ${requirementPath}`
  );

  console.error('');

  process.exit(1);
}

const playwrightTestPath =
  generatedTestPath
    .split(path.sep)
    .join('/');

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

    return 1;
  }

  return result.status ?? 1;
}

console.log('');
console.log('Execute Automated Tests');
console.log('=======================');
console.log('');

console.log(
  `Generated tests: ${generatedTestPath}`
);

console.log('');
console.log(
  'This step will:'
);

console.log(
  '  1. Validate that Playwright can discover the generated tests.'
);

console.log(
  '  2. Execute the generated tests against the configured browsers.'
);

console.log(
  '  3. Produce Playwright test results and diagnostic evidence.'
);

console.log('');
console.log(
  'This step will NOT modify the generated tests.'
);


// ----------------------------------------
// Discovery
// ----------------------------------------

console.log('');
console.log(
  '1. Validating Playwright test discovery...'
);

const discoveryStatus = run(
  'npx',
  [
    'playwright',
    'test',
    playwrightTestPath,
    '--list'
  ]
);

if (discoveryStatus !== 0) {
  console.error('');
  console.error(
    'Test execution stopped.'
  );

  console.error(
    'Playwright could not discover the generated tests.'
  );

  console.error('');

  process.exit(
    discoveryStatus
  );
}


// ----------------------------------------
// Execute
// ----------------------------------------

console.log('');
console.log(
  '2. Executing automated tests...'
);

const executionStatus = run(
  'npx',
  [
    'playwright',
    'test',
    playwrightTestPath
  ]
);


// ----------------------------------------
// Result
// ----------------------------------------

if (executionStatus !== 0) {
  console.error('');
  console.error(
    'Automated test execution completed with failures.'
  );

  console.error('');
  console.error(
    'The tests have NOT been modified.'
  );

  console.error('');
  console.error(
    'Next step: triage the failures.'
  );

  console.error('');

  console.error(
    `npm run qa:triage-test-failures -- ${requirementPath}`
  );

  console.error('');

  process.exit(
    executionStatus
  );
}

console.log('');
console.log(
  'Automated test execution completed successfully.'
);

console.log('');
console.log(
  'All generated tests passed.'
);

console.log('');