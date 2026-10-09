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
              'elements'
            ],

            properties: {
              urlBefore: {
                type: ['string', 'null']
              },

              urlAfter: {
                type: ['string', 'null']
              },

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
                    'text',
                    'placeholder',
                    'inputType',
                    'attributes',
                    'locatorEvidence'
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

                    role: {
                      type: [
                        'string',
                        'null'
                      ]
                    },

                    accessibleName: {
                      type: [
                        'string',
                        'null'
                      ]
                    },

                    text: {
                      type: [
                        'string',
                        'null'
                      ]
                    },

                    placeholder: {
                      type: [
                        'string',
                        'null'
                      ]
                    },

                    inputType: {
                      type: [
                        'string',
                        'null'
                      ]
                    },

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
                    },

                    locatorEvidence: {
                      type: 'array',

                      items: {
                        type: 'object',
                        additionalProperties: false,

                        required: [
                          'strategy',
                          'role',
                          'name',
                          'attribute',
                          'value',
                          'exact'
                        ],

                        properties: {
                          strategy: {
                            type: 'string',
                            enum: [
                              'role',
                              'label',
                              'placeholder',
                              'text',
                              'attribute'
                            ]
                          },

                          role: {
                            type: [
                              'string',
                              'null'
                            ]
                          },

                          name: {
                            type: [
                              'string',
                              'null'
                            ]
                          },

                          attribute: {
                            type: [
                              'string',
                              'null'
                            ]
                          },

                          value: {
                            type: [
                              'string',
                              'null'
                            ]
                          },

                          exact: {
                            type: 'boolean'
                          }
                        }
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

                    contentType: {
                      type: [
                        'string',
                        'null'
                      ]
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