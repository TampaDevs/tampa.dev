# API Clients

Auto-generated API clients for the Tampa Events API.

These clients are automatically generated from the OpenAPI specification using the GitHub Actions workflow.

## Available Clients

- **[TypeScript](./typescript/)** - TypeScript/JavaScript client with axios
- **[Python](./python/)** - Python client
- **[Go](./go/)** - Go client
- **[Ruby](./ruby/)** - Ruby client

## Usage

Each client directory contains its own README with installation and usage instructions.

## Regenerating Clients

Clients are automatically regenerated when:
- The OpenAPI schema changes
- A new commit is pushed to the master branch
- The workflow is manually triggered

To manually regenerate:
1. Go to Actions tab in GitHub
2. Select "Generate API Clients" workflow
3. Click "Run workflow"

## Development

The clients are generated from [schemas/openapi.json](../schemas/openapi.json) using [OpenAPI Generator](https://openapi-generator.tech/).

Generator configuration:
- TypeScript: `typescript-axios` generator
- Python: `python` generator
- Go: `go` generator
- Ruby: `ruby` generator
