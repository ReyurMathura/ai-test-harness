const nullableString = {
  anyOf: [
    {
      type: 'string'
    },
    {
      type: 'null'
    }
  ]
};


export const probeObservationSchema = {
  type: 'object',

  additionalProperties: false,

  required: [
    'scenarioId',
    'urlBefore',
    'urlAfter',
    'elements',
    'network',
    'successful',
    'missingEvidence'
  ],

  properties: {
    scenarioId: {
      type: 'string'
    },

    urlBefore:
      nullableString,

    urlAfter:
      nullableString,

    elements: {
      type: 'array',

      items: {
        type: 'object',

        additionalProperties: false,

        required: [
          'name',
          'kind',
          'role',
          'accessibleName',
          'label',
          'text',
          'placeholder',
          'inputType',
          'attributes'
        ],

        properties: {
          name: {
            type: 'string'
          },

          kind: {
            type: 'string',

            enum: [
              'input',
              'button',
              'message',
              'content',
              'navigation',
              'other'
            ]
          },

          role:
            nullableString,

          accessibleName:
            nullableString,

          label:
            nullableString,

          text:
            nullableString,

          placeholder:
            nullableString,

          inputType:
            nullableString,

          attributes: {
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
                  type: 'string'
                }
              }
            }
          }
        }
      }
    },

    network: {
      type: 'object',

      additionalProperties: false,

      required: [
        'applicationApiObserved',
        'requests'
      ],

      properties: {
        applicationApiObserved: {
          type: 'boolean'
        },

        requests: {
          type: 'array',

          items: {
            type: 'object',

            additionalProperties: false,

            required: [
              'method',
              'path',
              'status',
              'contentType',
              'classification'
            ],

            properties: {
              method: {
                type: 'string'
              },

              path: {
                type: 'string'
              },

              status: {
                type: 'integer'
              },

              contentType:
                nullableString,

              classification: {
                type: 'string',

                enum: [
                  'application-api',
                  'document',
                  'static-asset',
                  'analytics-telemetry',
                  'other'
                ]
              }
            }
          }
        }
      }
    },

    successful: {
      type: 'boolean'
    },

    missingEvidence: {
      type: 'array',

      items: {
        type: 'string'
      }
    }
  }
};