import fs from 'fs';
import path from 'path';
import { spawn } from 'cross-spawn';

const requirementPath =
  process.argv[2];

if (!requirementPath) {
  console.error(
    'Usage: node scripts/qa-create-api-tests.mjs <requirement-file>'
  );

  process.exit(1);
}

if (
  !fs.existsSync(
    requirementPath
  )
) {
  console.error(
    `Requirement file not found: ${requirementPath}`
  );

  process.exit(1);
}

const filename =
  path.basename(
    requirementPath,
    path.extname(
      requirementPath
    )
  );

const testPlanPath =
  `generated/${filename}-test-plan.json`;

const apiContextPath =
  `generated/${filename}-api-context.json`;

if (
  !fs.existsSync(
    testPlanPath
  )
) {
  console.error(
    `Test plan not found: ${testPlanPath}`
  );

  console.error('');
  console.error(
    'Create the test plan first:'
  );

  console.error(
    `npm run qa:create-test-plan -- ${requirementPath}`
  );

  process.exit(1);
}

if (
  !fs.existsSync(
    apiContextPath
  )
) {
  console.error(
    `API context not found: ${apiContextPath}`
  );

  console.error('');
  console.error(
    'Discover the API first:'
  );

  console.error(
    `npm run qa:discover-api -- ${requirementPath}`
  );

  process.exit(1);
}

console.log(
  `Requirement: ${requirementPath}`
);

console.log(
  `Test plan: ${testPlanPath}`
);

console.log(
  `API context: ${apiContextPath}`
);

console.log('');

const child =
  spawn(
    process.execPath,
    [
      'src/agents/api-test-generator.mjs',
      requirementPath,
      testPlanPath,
      apiContextPath
    ],
    {
      stdio: 'inherit'
    }
  );

child.on(
  'error',
  error => {
    console.error(
      'Failed to start API test generation.'
    );

    console.error(
      error
    );

    process.exit(1);
  }
);

child.on(
  'exit',
  code => {
    process.exit(
      code ?? 1
    );
  }
);