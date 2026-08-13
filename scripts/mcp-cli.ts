#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createAsoMcpServer } from '../lib/mcp/mcp-server';

async function main() {
  const server = createAsoMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('ASO Keyword Research MCP Server listening on stdio');
}

main().catch((err) => {
  console.error('Fatal MCP CLI Error:', err);
  process.exit(1);
});
