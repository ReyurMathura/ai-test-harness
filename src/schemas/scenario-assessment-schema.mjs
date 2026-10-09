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


export const scenarioAssessmentSchema = {
  type: 'object',

  additionalProperties: false,

  required: [
    'assessments'
  ],

  properties: {
    assessments: {
      type: 'array',

      items: {
        type: 'object',

        additionalProperties: false,

        required: [
          'scenarioId',
          'urlBeforePageId',
          'urlAfterPageId',
          'elementRefs',
          'stateIds',
          'transitionIds',
          'automationEvidenceSufficient',
          'missingEvidence',
          'probeNeeded',
          'probeGoal'
        ],

        properties: {
          scenarioId: {
            type: 'string'
          },

          urlBeforePageId:
            nullableString,

          urlAfterPageId:
            nullableString,

          elementRefs: {
            type: 'array',

            items: {
              type: 'object',

              additionalProperties: false,

              required: [
                'pageId',
                'elementId'
              ],

              properties: {
                pageId: {
                  type: 'string'
                },

                elementId: {
                  type: 'string'
                }
              }
            }
          },

          stateIds: {
            type: 'array',

            items: {
              type: 'string'
            }
          },

          transitionIds: {
            type: 'array',

            items: {
              type: 'string'
            }
          },

          automationEvidenceSufficient: {
            type: 'boolean'
          },

          missingEvidence: {
            type: 'array',

            items: {
              type: 'string'
            }
          },

          probeNeeded: {
            type: 'boolean'
          },

          probeGoal:
            nullableString
        }
      }
    }
  }
};