import {
  generateStructuredOutput as ollamaGenerate
} from './ollama-provider.mjs';

import {
  generateStructuredOutput as codexGenerate
} from './codex-provider.mjs';

export async function generateStructuredOutput(args) {
  const provider =
    process.env.AI_PROVIDER ?? 'codex';

  switch (provider) {
    case 'codex':
      return codexGenerate(args);

    case 'ollama':
      return ollamaGenerate(args);

    default:
      throw new Error(
        `Unsupported AI provider: ${provider}`
      );
  }
}