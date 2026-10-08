import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';

export async function generateStructuredOutput({
  prompt,
  schema,
  approvalPolicy = 'never',
  sandbox = 'read-only',
  autoReview = false
}) {
  const tempDir = fs.mkdtempSync(
    path.join(os.tmpdir(), 'ai-test-harness-')
  );

  const schemaPath =
    path.join(tempDir, 'schema.json');

  const outputPath =
    path.join(tempDir, 'output.json');

  fs.writeFileSync(
    schemaPath,
    JSON.stringify(schema, null, 2)
  );

  const model =
    process.env.CODEX_MODEL ?? 'gpt-5.6-luna';

  const reasoningEffort =
    process.env.CODEX_REASONING_EFFORT ?? 'low';

  const args = [
  '--ask-for-approval',
  approvalPolicy,

  'exec',

  '--model',
  model,

  '--sandbox',
  sandbox,

  '--config',
  `model_reasoning_effort=${reasoningEffort}`
];

if (autoReview) {
  args.push(
    '--config',
    'approvals_reviewer=auto_review'
  );
}

args.push(
  '--output-schema',
  schemaPath,

  '--output-last-message',
  outputPath,

  '-'
);

  const result = spawnSync(
    'codex',
    args,
    {
      input: prompt,
      encoding: 'utf-8',
      stdio: [
        'pipe',
        'inherit',
        'inherit'
      ],
      shell: process.platform === 'win32'
    }
  );

  if (result.status !== 0) {
    throw new Error(
      `Codex exited with code ${result.status}`
    );
  }

  if (!fs.existsSync(outputPath)) {
    throw new Error(
      'Codex did not produce structured output.'
    );
  }

  const output =
    fs.readFileSync(outputPath, 'utf-8');

  return JSON.parse(output);
}