import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { parse } = require('@babel/parser');

function walk(node, parent, visitor) {
  if (!node || typeof node !== 'object') {
    return;
  }

  visitor(node, parent);

  for (const [key, value] of Object.entries(node)) {
    if (
      key === 'loc' ||
      key === 'start' ||
      key === 'end' ||
      key === 'extra' ||
      key === 'comments' ||
      key === 'tokens'
    ) {
      continue;
    }

    if (Array.isArray(value)) {
      for (const child of value) {
        if (
          child &&
          typeof child === 'object' &&
          typeof child.type === 'string'
        ) {
          walk(
            child,
            node,
            visitor
          );
        }
      }

      continue;
    }

    if (
      value &&
      typeof value === 'object' &&
      typeof value.type === 'string'
    ) {
      walk(
        value,
        node,
        visitor
      );
    }
  }
}

function extractTests(source) {
  const ast = parse(
    source,
    {
      sourceType: 'module',

      plugins: [
        'typescript'
      ]
    }
  );

  const tests = new Map();
  const ranges = [];
  const duplicateIds = new Set();

  walk(
    ast.program,
    null,
    (node, parent) => {
      if (
        node.type !== 'CallExpression'
      ) {
        return;
      }

      if (
        node.callee?.type !== 'Identifier' ||
        node.callee.name !== 'test'
      ) {
        return;
      }

      const titleArgument =
        node.arguments?.[0];

      if (
        titleArgument?.type !==
        'StringLiteral'
      ) {
        return;
      }

      const match =
        titleArgument.value.match(
          /\b([A-Z]+-\d+)\b/
        );

      if (!match) {
        return;
      }

      const scenarioId =
        match[1];

      const target =
        parent?.type ===
        'ExpressionStatement'
          ? parent
          : node;

      if (
        typeof target.start !== 'number' ||
        typeof target.end !== 'number'
      ) {
        return;
      }

      if (
        tests.has(scenarioId)
      ) {
        duplicateIds.add(
          scenarioId
        );
      }

      tests.set(
        scenarioId,
        source
          .slice(
            target.start,
            target.end
          )
          .trim()
      );

      ranges.push({
        scenarioId,
        start: target.start,
        end: target.end
      });
    }
  );

  return {
    tests,
    ranges,
    duplicateIds
  };
}

function createSkeleton(
  source,
  ranges
) {
  let result = source;

  const orderedRanges =
    [...ranges].sort(
      (a, b) =>
        b.start - a.start
    );

  for (
    const range of orderedRanges
  ) {
    result =
      result.slice(
        0,
        range.start
      ) +
      `/* TEST:${range.scenarioId} */` +
      result.slice(
        range.end
      );
  }

  return result.trim();
}

export function validateRepairScope({
  originalSource,
  candidateSource,
  authorisedScenarioIds
}) {
  const errors = [];

  let original;
  let candidate;

  try {
    original =
      extractTests(
        originalSource
      );
  } catch (error) {
    return {
      valid: false,

      errors: [
        `Unable to parse original test source: ${error.message}`
      ],

      changedScenarioIds: []
    };
  }

  try {
    candidate =
      extractTests(
        candidateSource
      );
  } catch (error) {
    return {
      valid: false,

      errors: [
        `Unable to parse repair candidate: ${error.message}`
      ],

      changedScenarioIds: []
    };
  }

  if (
    original.duplicateIds.size > 0
  ) {
    errors.push(
      `Duplicate scenario IDs detected in original source: ${[
        ...original.duplicateIds
      ].join(', ')}`
    );
  }

  if (
    candidate.duplicateIds.size > 0
  ) {
    errors.push(
      `Duplicate scenario IDs detected in repair candidate: ${[
        ...candidate.duplicateIds
      ].join(', ')}`
    );
  }

  const originalIds =
    [...original.tests.keys()]
      .sort();

  const candidateIds =
    [...candidate.tests.keys()]
      .sort();

  if (
    JSON.stringify(originalIds) !==
    JSON.stringify(candidateIds)
  ) {
    errors.push(
      'Candidate added or removed test scenarios.'
    );
  }

  const authorised =
    new Set(
      authorisedScenarioIds
    );

  for (
    const scenarioId of authorised
  ) {
    if (
      !original.tests.has(
        scenarioId
      )
    ) {
      errors.push(
        `Authorised scenario ${scenarioId} does not exist in the original test source.`
      );
    }

    if (
      !candidate.tests.has(
        scenarioId
      )
    ) {
      errors.push(
        `Authorised scenario ${scenarioId} does not exist in the repair candidate.`
      );
    }
  }

  for (
    const scenarioId of originalIds
  ) {
    const before =
      original.tests.get(
        scenarioId
      );

    const after =
      candidate.tests.get(
        scenarioId
      );

    if (
      !authorised.has(
        scenarioId
      ) &&
      before !== after
    ) {
      errors.push(
        `Unauthorised change detected in ${scenarioId}.`
      );
    }
  }

  const originalSkeleton =
    createSkeleton(
      originalSource,
      original.ranges
    );

  const candidateSkeleton =
    createSkeleton(
      candidateSource,
      candidate.ranges
    );

  if (
    originalSkeleton !==
    candidateSkeleton
  ) {
    errors.push(
      'Candidate changed code outside individual test scenarios.'
    );
  }

  const changedAuthorised =
    authorisedScenarioIds.filter(
      scenarioId =>
        original.tests.has(
          scenarioId
        ) &&
        candidate.tests.has(
          scenarioId
        ) &&
        original.tests.get(
          scenarioId
        ) !==
          candidate.tests.get(
            scenarioId
          )
    );

  if (
    changedAuthorised.length === 0
  ) {
    errors.push(
      'Repair candidate did not change any authorised scenario.'
    );
  }

  return {
    valid:
      errors.length === 0,

    errors,

    changedScenarioIds:
      changedAuthorised
  };
}