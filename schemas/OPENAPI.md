# OpenAPI Specification

This file contains the OpenAPI 3.1 specification for the Tampa Events API.

## Usage

### Generating Client SDKs

You can use this OpenAPI spec to automatically generate client SDKs in any programming language:

```bash
# Install OpenAPI Generator
npm install -g @openapitools/openapi-generator-cli

# Generate TypeScript client
openapi-generator-cli generate -i openapi.json -g typescript-axios -o clients/typescript

# Generate Python client
openapi-generator-cli generate -i openapi.json -g python -o clients/python

# Generate Go client
openapi-generator-cli generate -i openapi.json -g go -o clients/go
```

### API Testing

Import this file into tools like:
- Postman
- Insomnia
- Swagger UI
- Stoplight

### Documentation

The OpenAPI spec serves as the single source of truth for API documentation.
You can view the interactive documentation at:

- **Production:** https://api.tampa.dev/docs
- **Development:** http://localhost:8787/docs

### Regeneration

To regenerate the OpenAPI spec:

```bash
npm run generate-openapi
```

Or fetch it from the running API:

```bash
curl https://api.tampa.dev/openapi.json > openapi.json
```

## Live Spec

The most up-to-date OpenAPI spec is always available at runtime:
- https://api.tampa.dev/openapi.json

This generated file is a snapshot for convenience and SDK generation.
