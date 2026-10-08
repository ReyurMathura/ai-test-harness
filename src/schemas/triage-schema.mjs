export const triageSchema = {
  type: 'object',
  additionalProperties: false,

  required: [
    'summary',
    'findings'
  ],

  properties: {
    summary: {
      type: 'string'
    },

    findings: {
      type: 'array',

      items: {
        type: 'object',
        additionalProperties: false,

        required: [
          'scenarioId',
          'title',
          'classification',
          'confidence',
          'reason',
          'recommendedAction',
          'humanReviewRequired'
        ],

        properties: {
          scenarioId: {
            type: ['string', 'null']
          },

          title: {
            type: 'string'
          },

          classification: {
            type: 'string',
            enum: [
              'TEST_BUG',
              'APPLICATION_BUG',
              'ENVIRONMENT_ISSUE',
              'FLAKY',
              'UNKNOWN'
            ]
          },

          confidence: {
            type: 'integer',
            minimum: 0,
            maximum: 100
          },

          reason: {
            type: 'string'
          },

          recommendedAction: {
            type: 'string'
          },

          humanReviewRequired: {
            type: 'boolean'
          }
        }
      }
    }
  }
};