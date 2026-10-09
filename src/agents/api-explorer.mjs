import fs from 'fs';
import path from 'path';
import Ajv from 'ajv';

import {
  apiContextSchema
} from '../schemas/api-context-schema.mjs';

import {
  generateStructuredOutput
} from '../ai/provider.mjs';

const requirementPath =
  process.argv[2];

const testPlanPath =
  process.argv[3];

if (
  !requirementPath ||
  !testPlanPath
) {
  console.error(
    'Usage: node src/agents/api-explorer.mjs <requirement-file> <test-plan-file>'
  );

  process.exit(1);
}

const requirements =
  fs.readFileSync(
    requirementPath,
    'utf-8'
  );

const testPlan =
  JSON.parse(
    fs.readFileSync(
      testPlanPath,
      'utf-8'
    )
  );

const automationScenarios =
  testPlan.scenarios.filter(
    scenario =>
      scenario.automationReady === true
  );

/*
 * The AI is only allowed to discover the API operation.
 *
 * It does NOT produce HTTP response evidence.
 *
 * Node fetch() executes the operation afterwards and provides the
 * authoritative runtime evidence.
 */
const operationDiscoverySchema = {
  type: 'object',
  additionalProperties: false,

  required: [
    'baseUrl',
    'scenarioOperations'
  ],

  properties: {
    baseUrl: {
      type: 'string'
    },

    scenarioOperations: {
      type: 'array',

      items: {
        type: 'object',
        additionalProperties: false,

        required: [
          'scenarioId',
          'method',
          'path',
          'queryParameters'
        ],

        properties: {
          scenarioId: {
            type: 'string'
          },

          method: {
            type: 'string',
            enum: [
              'GET',
              'POST',
              'PUT',
              'PATCH',
              'DELETE'
            ]
          },

          path: {
            type: 'string'
          },

          queryParameters: {
            type: 'array',

            items: {
              type: 'object',
              additionalProperties: false,

              required: [
                'name',
                'value'
              ],

              properties: {
                name: {
                  type: 'string'
                },

                value: {
                  anyOf: [
                    {
                      type: 'string'
                    },
                    {
                      type: 'number'
                    },
                    {
                      type: 'boolean'
                    }
                  ]
                }
              }
            }
          }
        }
      }
    }
  }
};

const prompt = `
You are a senior Quality Engineering API contract discovery agent.

Your ONLY job is to identify the API operations required by the
approved automation-ready scenarios.

Use the supplied API documentation as the primary source.

You may inspect:

- API documentation
- OpenAPI documentation
- Swagger documentation
- documentation pages linked from the requirements

Do NOT execute the API yourself.

Do NOT use:

- curl
- PowerShell Invoke-WebRequest
- wget
- shell HTTP commands
- browser requests to manufacture runtime evidence

A deterministic Node.js HTTP executor will run the discovered
operations after you finish.

You therefore need to return ONLY:

- base URL
- scenario ID
- HTTP method
- endpoint path
- query parameters

RULES:

1. Do not invent API operations.

2. Every operation must be supported by the supplied API
   documentation or explicit requirements.

3. Use the supplied test data exactly.

4. path must contain only the API path.

   Correct:

   /products

   /products/1

   /products/search

   Incorrect:

   https://dummyjson.com/products

5. Do not put query parameters into path.

   Correct:

   path = /products/search

   queryParameters:

   q = phone

6. Use concrete query parameter values.

7. Return exactly one operation for every supplied automation-ready
   scenario.

8. Do not return operations for exploratory or non-approved scenarios.

9. Do not return response status codes.

10. Do not return response headers.

11. Do not return response body fields.

12. Do not infer runtime behaviour.

13. Do not generate test code.

14. Do not execute mutation operations merely to inspect them.

15. Report only the operation necessary to execute each approved
    scenario.

SOFTWARE REQUIREMENTS:

${requirements}

APPROVED AUTOMATION-READY API SCENARIOS:

${JSON.stringify(
  automationScenarios,
  null,
  2
)}
`;

console.log(
  `Exploring API for: ${requirementPath}`
);

console.log(
  `Automation-ready scenarios: ${automationScenarios.length}`
);

console.log(
  `Using AI provider: ${process.env.AI_PROVIDER ?? 'codex'}`
);

console.log('');
console.log(
  'Discovering API operations from documentation...'
);

const discovery =
  await generateStructuredOutput({
    prompt,
    schema:
      operationDiscoverySchema,
    approvalPolicy: 'on-request',
    sandbox: 'read-only',
    autoReview: true
  });

const ajv =
  new Ajv({
    allErrors: true
  });

const validateDiscovery =
  ajv.compile(
    operationDiscoverySchema
  );

if (
  !validateDiscovery(
    discovery
  )
) {
  console.error(
    'API operation discovery returned invalid data.'
  );

  console.error(
    validateDiscovery.errors
  );

  process.exit(1);
}

const expectedScenarioIds =
  automationScenarios.map(
    scenario =>
      scenario.id
  );

const returnedScenarioIds =
  discovery.scenarioOperations.map(
    operation =>
      operation.scenarioId
  );

const duplicateScenarioIds =
  returnedScenarioIds.filter(
    (
      scenarioId,
      index,
      values
    ) =>
      values.indexOf(
        scenarioId
      ) !== index
  );

if (
  duplicateScenarioIds.length >
  0
) {
  console.error(
    'API operation discovery returned duplicate scenarios:'
  );

  for (
    const scenarioId
    of new Set(
      duplicateScenarioIds
    )
  ) {
    console.error(
      `- ${scenarioId}`
    );
  }

  process.exit(1);
}

const missingScenarioIds =
  expectedScenarioIds.filter(
    scenarioId =>
      !returnedScenarioIds.includes(
        scenarioId
      )
  );

if (
  missingScenarioIds.length >
  0
) {
  console.error(
    'API operation discovery did not return all approved scenarios:'
  );

  for (
    const scenarioId
    of missingScenarioIds
  ) {
    console.error(
      `- ${scenarioId}`
    );
  }

  process.exit(1);
}

const unexpectedScenarioIds =
  returnedScenarioIds.filter(
    scenarioId =>
      !expectedScenarioIds.includes(
        scenarioId
      )
  );

if (
  unexpectedScenarioIds.length >
  0
) {
  console.error(
    'API operation discovery returned unapproved scenarios:'
  );

  for (
    const scenarioId
    of unexpectedScenarioIds
  ) {
    console.error(
      `- ${scenarioId}`
    );
  }

  process.exit(1);
}

function normaliseBaseUrl(
  value
) {
  const parsed =
    new URL(value);

  if (
    parsed.protocol !==
      'https:' &&
    parsed.protocol !==
      'http:'
  ) {
    throw new Error(
      `Unsupported API protocol: ${parsed.protocol}`
    );
  }

  return parsed.origin;
}

const baseUrl =
  normaliseBaseUrl(
    discovery.baseUrl
  );

function buildRequestUrl(
  operation
) {
  if (
    operation.path.includes('?')
  ) {
    throw new Error(
      `Operation path must not contain a query string: ${operation.path}`
    );
  }

  if (
    !operation.path.startsWith('/')
  ) {
    throw new Error(
      `Operation path must start with "/": ${operation.path}`
    );
  }

  const url =
    new URL(
      operation.path,
      `${baseUrl}/`
    );

  for (
    const parameter
    of operation.queryParameters
  ) {
    url.searchParams.set(
      parameter.name,
      String(
        parameter.value
      )
    );
  }

  return url;
}

function getJsonType(
  value
) {
  if (
    value === null
  ) {
    return 'null';
  }

  if (
    Array.isArray(value)
  ) {
    return 'array';
  }

  if (
    typeof value ===
      'number'
  ) {
    return Number.isInteger(
      value
    )
      ? 'integer'
      : 'number';
  }

  if (
    typeof value ===
      'object'
  ) {
    return 'object';
  }

  if (
    typeof value ===
      'string'
  ) {
    return 'string';
  }

  if (
    typeof value ===
      'boolean'
  ) {
    return 'boolean';
  }

  return 'string';
}

function getSampleValue(
  value
) {
  if (
    value === null
  ) {
    return null;
  }

  if (
    typeof value ===
      'string' ||
    typeof value ===
      'number' ||
    typeof value ===
      'boolean'
  ) {
    return value;
  }

  return null;
}

function collectResponseFields(
  body
) {
  const fields = [];

  const maximumFields = 80;

  function pushField(
    fieldPath,
    value
  ) {
    if (
      !fieldPath ||
      fields.length >=
        maximumFields
    ) {
      return;
    }

    fields.push({
      path:
        fieldPath,

      type:
        getJsonType(
          value
        ),

      observed:
        true,

      sampleValue:
        getSampleValue(
          value
        ),

      arrayLength:
        Array.isArray(
          value
        )
          ? value.length
          : null
    });
  }

  function inspectValue(
    value,
    fieldPath,
    depth
  ) {
    if (
      fields.length >=
      maximumFields
    ) {
      return;
    }

    pushField(
      fieldPath,
      value
    );

    /*
     * We intentionally keep response evidence shallow.
     *
     * Top-level fields are collected.
     * For arrays of objects, one representative item is inspected.
     *
     * This gives us useful contract evidence without dumping an
     * entire large response into AI context.
     */
    if (
      depth >= 1
    ) {
      return;
    }

    if (
      Array.isArray(
        value
      )
    ) {
      if (
        value.length === 0
      ) {
        return;
      }

      const firstItem =
        value[0];

      if (
        firstItem !== null &&
        typeof firstItem ===
          'object' &&
        !Array.isArray(
          firstItem
        )
      ) {
        for (
          const [
            childName,
            childValue
          ]
          of Object.entries(
            firstItem
          )
        ) {
          inspectValue(
            childValue,
            `${fieldPath}[].${childName}`,
            depth + 1
          );
        }
      }

      return;
    }

    if (
      value !== null &&
      typeof value ===
        'object'
    ) {
      for (
        const [
          childName,
          childValue
        ]
        of Object.entries(
          value
        )
      ) {
        inspectValue(
          childValue,
          `${fieldPath}.${childName}`,
          depth + 1
        );
      }
    }
  }

  if (
    body !== null &&
    typeof body ===
      'object' &&
    !Array.isArray(
      body
    )
  ) {
    for (
      const [
        fieldName,
        value
      ]
      of Object.entries(
        body
      )
    ) {
      inspectValue(
        value,
        fieldName,
        0
      );
    }

    return fields;
  }

  if (
    Array.isArray(
      body
    ) &&
    body.length > 0
  ) {
    const firstItem =
      body[0];

    if (
      firstItem !== null &&
      typeof firstItem ===
        'object' &&
      !Array.isArray(
        firstItem
      )
    ) {
      for (
        const [
          fieldName,
          value
        ]
        of Object.entries(
          firstItem
        )
      ) {
        inspectValue(
          value,
          `[].${fieldName}`,
          0
        );
      }
    }
  }

  return fields;
}

async function parseResponseBody(
  response
) {
  const text =
    await response.text();

  if (
    text.length === 0
  ) {
    return null;
  }

  try {
    return JSON.parse(
      text
    );
  } catch {
    return text;
  }
}

const responseCache =
  new Map();

async function executeOperation(
  operation
) {
  const requestUrl =
    buildRequestUrl(
      operation
    );

  /*
   * The first API POC is intentionally read-only.
   *
   * We can add guarded mutation execution later when we introduce
   * POST/PUT/PATCH/DELETE scenarios.
   */
  if (
    operation.method !==
    'GET'
  ) {
    return {
      response: {
        status: null,
        contentType: null,
        bodyType: null,
        fields: []
      },

      error:
        `Deterministic API discovery currently permits GET only; discovered ${operation.method}.`
    };
  }

  const cacheKey =
    `${operation.method} ${requestUrl.toString()}`;

  if (
    responseCache.has(
      cacheKey
    )
  ) {
    return responseCache.get(
      cacheKey
    );
  }

  const controller =
    new AbortController();

  const timeout =
    setTimeout(
      () => {
        controller.abort();
      },
      15000
    );

  try {
    console.log(
      `Observing ${operation.method} ${requestUrl.toString()}`
    );

    const response =
      await fetch(
        requestUrl,
        {
          method:
            operation.method,

          headers: {
            accept:
              'application/json'
          },

          signal:
            controller.signal
        }
      );

    const body =
      await parseResponseBody(
        response
      );

    const result = {
      response: {
        status:
          response.status,

        contentType:
          response.headers.get(
            'content-type'
          ),

        bodyType:
          getJsonType(
            body
          ),

        fields:
          collectResponseFields(
            body
          )
      },

      error: null
    };

    responseCache.set(
      cacheKey,
      result
    );

    return result;
  } catch (
    error
  ) {
    const result = {
      response: {
        status: null,
        contentType: null,
        bodyType: null,
        fields: []
      },

      error:
        error instanceof Error
          ? error.message
          : String(
              error
            )
    };

    responseCache.set(
      cacheKey,
      result
    );

    return result;
  } finally {
    clearTimeout(
      timeout
    );
  }
}

console.log('');
console.log(
  'Executing discovered API operations with deterministic Node fetch...'
);

const scenarioEvidence = [];

for (
  const operation
  of discovery.scenarioOperations
) {
  const observation =
    await executeOperation(
      operation
    );

  const missingEvidence = [];

  if (
    observation.error
  ) {
    missingEvidence.push(
      `Live API observation failed: ${observation.error}`
    );
  }

  if (
    observation.response.status ===
    null
  ) {
    missingEvidence.push(
      'No live HTTP status code was observed.'
    );
  }

  if (
    observation.response.contentType ===
    null
  ) {
    missingEvidence.push(
      'No live response Content-Type was observed.'
    );
  }

  if (
    observation.response.bodyType ===
    null
  ) {
    missingEvidence.push(
      'No live response body was observed.'
    );
  }

  if (
    (
      observation.response.bodyType ===
        'object' ||
      observation.response.bodyType ===
        'array'
    ) &&
    observation.response.fields.length ===
      0
  ) {
    missingEvidence.push(
      'No response fields could be extracted from the live response body.'
    );
  }

  scenarioEvidence.push({
    scenarioId:
      operation.scenarioId,

    operation: {
      method:
        operation.method,

      path:
        operation.path,

      queryParameters:
        operation.queryParameters
    },

    response:
      observation.response,

    automationEvidenceSufficient:
      missingEvidence.length ===
      0,

    missingEvidence
  });
}

const context = {
  feature:
    testPlan.feature ??
    path.basename(
      requirementPath,
      path.extname(
        requirementPath
      )
    ),

  baseUrl,

  scenarioEvidence
};

const validateContext =
  ajv.compile(
    apiContextSchema
  );

if (
  !validateContext(
    context
  )
) {
  console.error(
    'Deterministic API context failed schema validation.'
  );

  console.error(
    validateContext.errors
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

const outputPath =
  `generated/${filename}-api-context.json`;

fs.mkdirSync(
  path.dirname(
    outputPath
  ),
  {
    recursive: true
  }
);

fs.writeFileSync(
  outputPath,
  JSON.stringify(
    context,
    null,
    2
  )
);

const sufficient =
  context.scenarioEvidence.filter(
    evidence =>
      evidence
        .automationEvidenceSufficient ===
      true
  );

const insufficient =
  context.scenarioEvidence.filter(
    evidence =>
      evidence
        .automationEvidenceSufficient ===
      false
  );

console.log('');
console.log(
  'API exploration complete.'
);

console.log(
  `Output: ${outputPath}`
);

console.log(
  `Scenario evidence records: ${context.scenarioEvidence.length}`
);

console.log(
  `Automation evidence sufficient: ${sufficient.length}`
);

console.log(
  `Automation evidence insufficient: ${insufficient.length}`
);

if (
  insufficient.length >
  0
) {
  console.log('');
  console.log(
    'Scenarios requiring additional API evidence:'
  );

  for (
    const evidence
    of insufficient
  ) {
    console.log(
      `- ${evidence.scenarioId}`
    );

    for (
      const missing
      of evidence.missingEvidence
    ) {
      console.log(
        `  - ${missing}`
      );
    }
  }
}