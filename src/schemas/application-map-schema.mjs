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


const observedElementSchema = {
  type: 'object',

  additionalProperties: false,

  required: [
    'elementId',
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
    elementId: {
      type: 'string'
    },

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

    role: nullableString,

    accessibleName: nullableString,

    label: nullableString,

    text: nullableString,

    placeholder: nullableString,

    inputType: nullableString,

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
};


const networkSchema = {
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

          contentType: nullableString,

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
};


export const applicationMapSchema = {
  type: 'object',

  additionalProperties: false,

  required: [
    'feature',
    'targetUrl',
    'pages',
    'transitions',
    'observedStates',
    'network'
  ],

  properties: {
    feature: {
      type: 'string'
    },

    targetUrl: {
      type: 'string'
    },

    pages: {
      type: 'array',

      items: {
        type: 'object',

        additionalProperties: false,

        required: [
          'pageId',
          'name',
          'url',
          'elements'
        ],

        properties: {
          pageId: {
            type: 'string'
          },

          name: {
            type: 'string'
          },

          url: {
            type: 'string'
          },

          elements: {
            type: 'array',

            items:
              observedElementSchema
          }
        }
      }
    },

    transitions: {
      type: 'array',

      items: {
        type: 'object',

        additionalProperties: false,

        required: [
          'transitionId',
          'fromPageId',
          'toPageId',
          'elementId',
          'action',
          'result'
        ],

        properties: {
          transitionId: {
            type: 'string'
          },

          fromPageId: {
            type: 'string'
          },

          toPageId:
            nullableString,

          elementId:
            nullableString,

          action: {
            type: 'string'
          },

          result: {
            type: 'string'
          }
        }
      }
    },

    observedStates: {
      type: 'array',

      items: {
        type: 'object',

        additionalProperties: false,

        required: [
          'stateId',
          'pageId',
          'description',
          'elementIds'
        ],

        properties: {
          stateId: {
            type: 'string'
          },

          pageId: {
            type: 'string'
          },

          description: {
            type: 'string'
          },

          elementIds: {
            type: 'array',

            items: {
              type: 'string'
            }
          }
        }
      }
    },

    network:
      networkSchema
  }
};