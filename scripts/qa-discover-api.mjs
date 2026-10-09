import fs from 'fs';
import path from 'path';
import { spawn } from 'cross-spawn';

const requirementPath = process.argv[2];

if (!requirementPath) {
  console.error(
    'Usage: node scripts/qa-discover-api.mjs <requirement-file>'
  );

  process.exit(1);
}

if (!fs.existsSync(requirementPath)) {
  console.error(
    `Requirement file not found: ${requirementPath}`
  );

  process.exit(1);
}

const filename =
  path.basename(
    requirementPath,
    path.extname(requirementPath)
  );

const testPlanPath =
  `generated/${filename}-test-plan.json`;

if (!fs.existsSync(testPlanPath)) {
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

console.log(
  `Requirement: ${requirementPath}`
);

console.log(
  `Test plan: ${testPlanPath}`
);

console.log('');

const child =
  spawn(
    process.execPath,
    [
      'src/agents/api-explorer.mjs',
      requirementPath,
      testPlanPath
    ],
    {
      stdio: 'inherit'
    }
  );

child.on(
  'error',
  error => {
    console.error(
      'Failed to start API discovery.'
    );

    console.error(error);

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