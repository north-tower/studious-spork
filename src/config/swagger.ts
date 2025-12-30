import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Retailer Comparison API',
      version: '1.0.0',
      description: 'API documentation for the Retailer Comparison Backend',
      contact: {
        name: 'API Support',
      },
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 3000}`,
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            email: {
              type: 'string',
              format: 'email',
            },
            name: {
              type: 'string',
              nullable: true,
            },
            plan: {
              type: 'string',
              enum: ['free', 'starter', 'professional', 'enterprise'],
              default: 'free',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        Retailer: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            name: {
              type: 'string',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        Country: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            name: {
              type: 'string',
            },
            code: {
              type: 'string',
              description: 'ISO country code',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        DeliveryData: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            retailerId: {
              type: 'string',
              format: 'uuid',
            },
            countryId: {
              type: 'string',
              format: 'uuid',
            },
            method: {
              type: 'string',
            },
            cost: {
              type: 'string',
            },
            duration: {
              type: 'string',
            },
            freeShippingThreshold: {
              type: 'string',
              nullable: true,
            },
            carrier: {
              type: 'string',
              nullable: true,
            },
            additionalNotes: {
              type: 'string',
              nullable: true,
            },
            dataSource: {
              type: 'string',
              default: 'web_search',
            },
            status: {
              type: 'string',
              enum: ['verified', 'partial_data', 'requires_verification'],
              default: 'verified',
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        Comparison: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            userId: {
              type: 'string',
              format: 'uuid',
            },
            retailers: {
              type: 'array',
              items: {
                type: 'string',
              },
            },
            country: {
              type: 'string',
            },
            results: {
              type: 'object',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
            },
            details: {
              type: 'array',
              items: {
                type: 'object',
              },
            },
          },
        },
        AuthResponse: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
            },
            user: {
              $ref: '#/components/schemas/User',
            },
            token: {
              type: 'string',
            },
          },
        },
      },
    },
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication endpoints',
      },
      {
        name: 'Retailers',
        description: 'Retailer management endpoints',
      },
      {
        name: 'Countries',
        description: 'Country management endpoints',
      },
      {
        name: 'Delivery Data',
        description: 'Delivery data management endpoints',
      },
      {
        name: 'Comparison',
        description: 'Retailer comparison endpoints',
      },
      {
        name: 'Upload',
        description: 'File upload endpoints',
      },
    ],
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);

