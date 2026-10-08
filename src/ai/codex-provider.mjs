import fs from 'fs';
import os from 'os';
import path from 'path';
import spawn from 'cross-spawn';

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

  try {
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

    const codexCommand =
      process.env.CODEX_COMMAND ?? 'codex';

    const result = spawn.sync(
      codexCommand,
      args,
      {
        input: prompt,
        encoding: 'utf-8',
        stdio: ['pipe', 'inherit', 'inherit']
      }
    );

    if (result.error) {
      throw result.error;
    }

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
  } finally {
    fs.rmSync(
      tempDir,
      {
        recursive: true,
        force: true
      }
    );
  }
}