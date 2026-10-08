export const testPlanSchema = {
  type: 'object',
  additionalProperties: false,

  required: [
    'feature',
    'summary',
    'scenarios'
  ],

  properties: {
    feature: {
      type: 'string'
    },

    summary: {
      type: 'string'
    },

    scenarios: {
      type: 'array',

      items: {
        type: 'object',
        additionalProperties: false,

        required: [
          'id',
          'title',
          'type',
          'priority',
          'source',
          'requirementReference',
          'preconditions',
          'testData',
          'steps',
          'expectedResult',
          'evidence',
          'assumptions',
          'automationReady',
          'rationale'
        ],

        properties: {
          id: {
            type: 'string'
          },

          title: {
            type: 'string'
          },

          type: {
            type: 'string',
            enum: [
              'positive',
              'negative',
              'validation',
              'boundary',
              'security',
              'usability',
              'exploratory'
            ]
          },

          priority: {
            type: 'string',
            enum: [
              'critical',
              'high',
              'medium',
              'low'
            ]
          },

          source: {
            type: 'string',
            enum: [
              'requirement',
              'exploratory'
            ]
          },

          requirementReference: {
            type: [
              'string',
              'null'
            ]
          },

          preconditions: {
            type: 'array',
            items: {
              type: 'string'
            }
          },

          testData: {
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
          },

          steps: {
            type: 'array',
            minItems: 1,

            items: {
              type: 'string'
            }
          },

          expectedResult: {
            type: 'string'
          },

          evidence: {
            type: 'string'
          },

          assumptions: {
            type: 'array',
            items: {
              type: 'string'
            }
          },

          automationReady: {
            type: 'boolean'
          },

          rationale: {
            type: [
              'string',
              'null'
            ]
          }
        }
      }
    }
  }
};