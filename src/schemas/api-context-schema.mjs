const nullableStringSchema = {
  anyOf: [
    {
      type: 'string'
    },
    {
      type: 'null'
    }
  ]
};

const nullableIntegerSchema = {
  anyOf: [
    {
      type: 'integer',
      minimum: 0
    },
    {
      type: 'null'
    }
  ]
};

const queryValueSchema = {
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
};

const sampleValueSchema = {
  anyOf: [
    {
      type: 'string'
    },
    {
      type: 'number'
    },
    {
      type: 'boolean'
    },
    {
      type: 'null'
    }
  ]
};

const responseStatusSchema = {
  anyOf: [
    {
      type: 'integer',
      minimum: 100,
      maximum: 599
    },
    {
      type: 'null'
    }
  ]
};

const bodyTypeSchema = {
  anyOf: [
    {
      type: 'string',
      enum: [
        'object',
        'array',
        'string',
        'number',
        'boolean',
        'null'
      ]
    },
    {
      type: 'null'
    }
  ]
};

export const apiContextSchema = {
  type: 'object',
  additionalProperties: false,

  required: [
    'feature',
    'baseUrl',
    'scenarioEvidence'
  ],

  properties: {
    feature: {
      type: 'string'
    },

    baseUrl: {
      type: 'string'
    },

    scenarioEvidence: {
      type: 'array',

      items: {
        type: 'object',
        additionalProperties: false,

        required: [
          'scenarioId',
          'operation',
          'response',
          'automationEvidenceSufficient',
          'missingEvidence'
        ],

        properties: {
          scenarioId: {
            type: 'string'
          },

          operation: {
            type: 'object',
            additionalProperties: false,

            required: [
              'method',
              'path',
              'queryParameters'
            ],

            properties: {
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

                    value: queryValueSchema
                  }
                }
              }
            }
          },

          response: {
            type: 'object',
            additionalProperties: false,

            required: [
              'status',
              'contentType',
              'bodyType',
              'fields'
            ],

            properties: {
              status: responseStatusSchema,

              contentType: nullableStringSchema,

              bodyType: bodyTypeSchema,

              fields: {
                type: 'array',

                items: {
                  type: 'object',
                  additionalProperties: false,

                  required: [
                    'path',
                    'type',
                    'observed',
                    'sampleValue',
                    'arrayLength'
                  ],

                  properties: {
                    path: {
                      type: 'string'
                    },

                    type: {
                      type: 'string',
                      enum: [
                        'string',
                        'number',
                        'integer',
                        'boolean',
                        'object',
                        'array',
                        'null'
                      ]
                    },

                    observed: {
                      type: 'boolean'
                    },

                    sampleValue: sampleValueSchema,

                    arrayLength:
                      nullableIntegerSchema
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