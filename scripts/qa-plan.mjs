import fs from 'fs';
import path from 'path';
import spawn from 'cross-spawn';

const requirementPath = process.argv[2];

if (!requirementPath) {
  console.error(
    'Usage: npm run qa:plan -- <requirement-file>'
  );
  process.exit(1);
}

if (!fs.existsSync(requirementPath)) {
  console.error(
    `Requirement file not found: ${requirementPath}`
  );
  process.exit(1);
}

const featureName =
  path.basename(
    requirementPath,
    path.extname(requirementPath)
  );

const planPath =
  `generated/${featureName}-test-plan.json`;

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
    console.error(
      `Failed to start ${command}: ${result.error.message}`
    );
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(
      result.status ?? 1
    );
  }
}

console.log('');
console.log('AI Test Planning');
console.log('================');
console.log(`Requirements: ${requirementPath}`);

console.log('');
console.log('1. Generating structured test plan...');

run(
  'node',
  [
    'src/agents/test-planner.mjs',
    requirementPath
  ]
);

console.log('');
console.log('2. Rendering human-readable plan...');

run(
  'node',
  [
    'scripts/render-test-plan.mjs',
    planPath
  ]
);

console.log('');
console.log('Test planning complete.');
console.log('');
console.log(`Machine plan: ${planPath}`);
console.log(
  `Review plan:  ${planPath.replace(/\.json$/i, '.md')}`
);
console.log('');
console.log(
  'Review the Markdown plan before proceeding to application exploration and automation.'
);