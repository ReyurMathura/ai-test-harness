import fs from 'fs';
import path from 'path';
import spawn from 'cross-spawn';

import {
  validateRepairScope
} from '../src/validation/repair-scope.mjs';

const metadataPath = process.argv[2];

if (!metadataPath) {
  console.error(
    'Usage: node scripts/promote-repair.mjs <repair-metadata>'
  );

  process.exit(1);
}

const metadata = JSON.parse(
  fs.readFileSync(metadataPath, 'utf-8')
);

if (!metadata.candidatePath) {
  console.error(
    'Repair metadata does not contain candidatePath.'
  );

  process.exit(1);
}

const candidatePath = path.normalize(
  metadata.candidatePath
);

if (!fs.existsSync(candidatePath)) {
  console.error(
    `Repair candidate not found: ${candidatePath}`
  );

  process.exit(1);
}

const playwrightCandidatePath =
  candidatePath.split(path.sep).join('/');

const originalPath = candidatePath.replace(
  `${path.sep}repair-candidates${path.sep}`,
  path.sep
);

if (!fs.existsSync(originalPath)) {
  console.error(
    `Original generated test not found: ${originalPath}`
  );

  process.exit(1);
}

if (
  !Array.isArray(metadata.repairedScenarioIds) ||
  metadata.repairedScenarioIds.length === 0
) {
  console.error(
    'Repair metadata does not contain any repairedScenarioIds.'
  );

  process.exit(1);
}

console.log(
  `Candidate: ${candidatePath}`
);

console.log(
  `Original:  ${originalPath}`
);

const originalSource =
  fs.readFileSync(
    originalPath,
    'utf-8'
  );

const candidateSource =
  fs.readFileSync(
    candidatePath,
    'utf-8'
  );

const scopeValidation =
  validateRepairScope({
    originalSource,
    candidateSource,
    authorisedScenarioIds:
      metadata.repairedScenarioIds
  });

console.log('');
console.log(
  '1. Validating repair scope...'
);

if (!scopeValidation.valid) {
  console.error(
    'Promotion blocked: repair exceeded authorised scope.'
  );

  for (
    const error of scopeValidation.errors
  ) {
    console.error(
      `- ${error}`
    );
  }

  process.exit(1);
}

console.log(
  `Authorised changes: ${scopeValidation.changedScenarioIds.join(', ')}`
);

function runPlaywright(args) {
  const result = spawn.sync(
    'npx',
    [
      'playwright',
      'test',
      ...args
    ],
    {
      encoding: 'utf-8',
      stdio: 'inherit'
    }
  );

  if (result.error) {
    console.error(
      `Failed to start Playwright: ${result.error.message}`
    );

    return false;
  }

  return result.status === 0;
}

console.log('');
console.log(
  '2. Validating Playwright discovery...'
);

const discoveryPassed =
  runPlaywright([
    playwrightCandidatePath,
    '--list'
  ]);

if (!discoveryPassed) {
  console.error('');
  console.error(
    'Promotion blocked: candidate failed Playwright discovery.'
  );

  process.exit(1);
}

console.log('');
console.log(
  '3. Executing repair candidate...'
);

const executionPassed =
  runPlaywright([
    playwrightCandidatePath
  ]);

if (!executionPassed) {
  console.error('');
  console.error(
    'Promotion blocked: repair candidate failed execution.'
  );

  process.exit(1);
}

console.log('');
console.log(
  '4. Candidate passed validation.'
);

const backupDirectory =
  path.join(
    'tests',
    'generated',
    'backups'
  );

fs.mkdirSync(
  backupDirectory,
  {
    recursive: true
  }
);

const timestamp =
  new Date()
    .toISOString()
    .replaceAll(':', '-')
    .replaceAll('.', '-');

const originalExtension =
  path.extname(originalPath);

const originalBaseName =
  path.basename(
    originalPath,
    originalExtension
  );

const backupPath =
  path.join(
    backupDirectory,
    `${originalBaseName}-${timestamp}${originalExtension}`
  );

fs.copyFileSync(
  originalPath,
  backupPath
);

fs.copyFileSync(
  candidatePath,
  originalPath
);

console.log('');
console.log(
  'Repair promoted successfully.'
);

console.log(
  `Backup:   ${backupPath}`
);

console.log(
  `Promoted: ${originalPath}`
);