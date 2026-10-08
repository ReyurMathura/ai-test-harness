export const repairSchema = {
  type: 'object',
  additionalProperties: false,

  required: [
    'summary',
    'repairedScenarioIds',
    'changes',
    'code'
  ],

  properties: {
    summary: {
      type: 'string'
    },

    repairedScenarioIds: {
      type: 'array',
      items: {
        type: 'string'
      }
    },

    changes: {
      type: 'array',

      items: {
        type: 'object',
        additionalProperties: false,

        required: [
          'scenarioId',
          'description'
        ],

        properties: {
          scenarioId: {
            type: 'string'
          },

          description: {
            type: 'string'
          }
        }
      }
    },

    code: {
      type: 'string'
    }
  }
};