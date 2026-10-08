export const applicationContextSchema = {
  type: 'object',
  additionalProperties: false,

  required: [
    'feature',
    'targetUrl',
    'scenarioEvidence'
  ],

  properties: {
    feature: {
      type: 'string'
    },

    targetUrl: {
      type: 'string'
    },

    scenarioEvidence: {
      type: 'array',

      items: {
        type: 'object',
        additionalProperties: false,

        required: [
          'scenarioId',
          'ui',
          'network',
          'automationEvidenceSufficient',
          'missingEvidence'
        ],

        properties: {
          scenarioId: {
            type: 'string'
          },

          ui: {
            type: 'object',
            additionalProperties: false,

            required: [
              'urlBefore',
              'urlAfter',
              'controls',
              'visibleEvidence'
            ],

            properties: {
              urlBefore: {
                type: ['string', 'null']
              },

              urlAfter: {
                type: ['string', 'null']
              },

              controls: {
                type: 'array',

                items: {
                  type: 'object',
                  additionalProperties: false,

                  required: [
                    'name',
                    'role',
                    'accessibleName',
                    'placeholder',
                    'inputType',
                    'testId'
                  ],

                  properties: {
                    name: {
                      type: 'string'
                    },

                    role: {
                      type: ['string', 'null']
                    },

                    accessibleName: {
                      type: ['string', 'null']
                    },

                    placeholder: {
                      type: ['string', 'null']
                    },

                    inputType: {
                      type: ['string', 'null']
                    },

                    testId: {
                      type: ['string', 'null']
                    }
                  }
                }
              },

              visibleEvidence: {
                type: 'array',
                items: {
                  type: 'string'
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

                    contentType: {
                      type: ['string', 'null']
                    },

                    classification: {
                      type: 'string',
                      enum: [
                        'application-api',
                        'document',
                        'static-asset',
                        'analytics-telemetry',
                        'unknown'
                      ]
                    }
                  }
                }
              }
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
          }
        }
      }
    }
  }
};