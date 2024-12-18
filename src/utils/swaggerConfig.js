const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0", // Specify the version of the OpenAPI Specification
    info: {
      title: "Your API Title", // Title of your API
      version: "1.0.0", // Version of your API
      description: "A simple API description", // Description of your API
    },
    servers: [
      {
        url: "https://be-jobfinder222.onrender.com", // Specify your server URL
      },
    ],
  },
  apis: ["./src/routers/web.js"], // Path to the API routes files
};

const specs = swaggerJsdoc(options);

module.exports = specs;
