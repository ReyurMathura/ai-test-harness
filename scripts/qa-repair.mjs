import fs from 'fs';
import path from 'path';
import spawn from 'cross-spawn';

const requirementPath = process.argv[2];

if (!requirementPath) {
  console.error('');
  console.error(
    'Usage: npm run qa:repair-test-automation -- <requirement-file>'
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

const triagePath =
  'reports/triage.json';

const repairPath =
  'reports/repair.json';

const requiredFiles = [
  testPlanPath,
  applicationContextPath,
  testPath,
  triagePath
];

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) {
    console.error('');
    console.error(
      'Cannot repair test automation.'
    );

    console.error(
      `Required file is missing: ${file}`
    );

    console.error('');
    console.error(
      'Triage the failed tests first:'
    );

    console.error('');

    console.error(
      `npm run qa:triage-test-failures -- ${requirementPath}`
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
console.log('Repair Test Automation');
console.log('======================');
console.log('');

console.log(
  'This step will attempt to repair eligible TEST_BUG failures.'
);

console.log('');

console.log(
  'A repair is only allowed when the triage evidence indicates'
);

console.log(
  'that the automated test is defective rather than the application.'
);

console.log('');

console.log(
  'The repair workflow will:'
);

console.log(
  '  1. Read the existing triage result.'
);

console.log(
  '  2. Generate a repair candidate.'
);

console.log(
  '  3. Verify that only authorised scenarios changed.'
);

console.log(
  '  4. Validate Playwright test discovery.'
);

console.log(
  '  5. Execute the repair candidate.'
);

console.log(
  '  6. Promote the candidate only if validation succeeds.'
);

console.log('');

console.log(
  'APPLICATION_BUG, ENVIRONMENT_ISSUE, FLAKY and UNKNOWN'
);

console.log(
  'classifications will not be repaired as test defects.'
);


// ----------------------------------------
// Generate candidate
// ----------------------------------------

console.log('');
console.log(
  '1. Generating repair candidate...'
);

run(
  'node',
  [
    'src/agents/repair.mjs',
    triagePath,
    testPlanPath,
    applicationContextPath,
    testPath
  ]
);

if (!fs.existsSync(repairPath)) {
  console.error('');
  console.error(
    `Repair metadata was not created: ${repairPath}`
  );

  console.error('');

  process.exit(1);
}


// ----------------------------------------
// Validate and promote
// ----------------------------------------

console.log('');
console.log(
  '2. Validating repair candidate...'
);

run(
  'node',
  [
    'scripts/promote-repair.mjs',
    repairPath
  ]
);


// ----------------------------------------
// Complete
// ----------------------------------------

console.log('');
console.log(
  'Test automation repair completed successfully.'
);

console.log('');

console.log(
  `Updated test file: ${testPath}`
);

console.log('');
console.log(
  'The repaired automation was validated before promotion.'
);

console.log('');