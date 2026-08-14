import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const openApiSpec = {
    openapi: '3.0.3',
    info: {
      title: 'ASO Keyword Research & Rank Tracker API',
      version: '1.0.0',
      description:
        'REST and MCP-enabled API for App Store & Google Play Store keyword research, difficulty scoring, and rank tracking.',
    },
    servers: [
      {
        url: '/',
        description: 'Current Next.js application server',
      },
    ],
    paths: {
      '/api/mcp': {
        post: {
          summary: 'MCP JSON-RPC 2.0 Endpoint',
          description: 'Model Context Protocol endpoint for executing AI agent tools (research_keywords, check_app_rankings, lookup_app_details, extract_app_keywords).',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    jsonrpc: { type: 'string', example: '2.0' },
                    id: { type: 'integer', example: 1 },
                    method: { type: 'string', example: 'tools/call' },
                    params: { type: 'object' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Successful MCP response',
            },
          },
        },
      },
      '/api/research': {
        post: {
          summary: 'Perform ASO Keyword Research',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    seedKeyword: { type: 'string', example: 'fitness' },
                    platform: { type: 'string', enum: ['ios', 'android', 'both'], default: 'both' },
                    country: { type: 'string', default: 'us' },
                  },
                },
              },
            },
          },
          responses: {
            '200': { description: 'Keyword research metrics, popularity, difficulty, and competitors.' },
          },
        },
      },
      '/api/rank-check': {
        post: {
          summary: 'Check App Search Ranks',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    appId: { type: 'string', example: 'com.spotify.music' },
                    keywords: { type: 'array', items: { type: 'string' } },
                    platform: { type: 'string', enum: ['ios', 'android'], default: 'ios' },
                    country: { type: 'string', default: 'us' },
                  },
                  required: ['appId', 'keywords'],
                },
              },
            },
          },
          responses: {
            '200': { description: 'Rank positions (1-50) and top competitor breakdown.' },
          },
        },
      },
      '/api/app-lookup': {
        post: {
          summary: 'Lookup App Details',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    appId: { type: 'string', example: '389801252' },
                    platform: { type: 'string', enum: ['ios', 'android'], default: 'ios' },
                    country: { type: 'string', default: 'us' },
                  },
                  required: ['appId'],
                },
              },
            },
          },
          responses: {
            '200': { description: 'App metadata including title, developer, rating, and icon.' },
          },
        },
      },
      '/api/discover-competitors': {
        get: {
          summary: 'Discover Competitor Apps',
          parameters: [
            { name: 'keyword', in: 'query', required: true, schema: { type: 'string' } },
            { name: 'platform', in: 'query', schema: { type: 'string', enum: ['ios', 'android'], default: 'ios' } },
            { name: 'country', in: 'query', schema: { type: 'string', default: 'us' } },
          ],
          responses: {
            '200': { description: 'List of top competing apps for the given keyword or topic.' },
          },
        },
      },
      '/api/competitor-keywords': {
        get: {
          summary: 'Get Competitor Ranked Keywords',
          parameters: [
            { name: 'appId', in: 'query', required: true, schema: { type: 'string' } },
            { name: 'appName', in: 'query', schema: { type: 'string' } },
            { name: 'platform', in: 'query', schema: { type: 'string', enum: ['ios', 'android'], default: 'ios' } },
          ],
          responses: {
            '200': { description: 'Top 50 ranked keywords with search volume, impressions, and difficulty.' },
          },
        },
      },
      '/api/competitor-matrix': {
        get: {
          summary: 'Competitor Keyword Comparison Matrix',
          parameters: [
            { name: 'myAppId', in: 'query', required: true, schema: { type: 'string' } },
            { name: 'competitors', in: 'query', required: true, schema: { type: 'string' } },
            { name: 'platform', in: 'query', schema: { type: 'string', enum: ['ios', 'android'], default: 'ios' } },
          ],
          responses: {
            '200': { description: 'Side-by-side keyword overlap matrix, shared rankings, and missed keyword opportunities.' },
          },
        },
      },
      '/api/competitor-reviews': {
        get: {
          summary: 'Competitor Reviews & Sentiment Analysis',
          parameters: [
            { name: 'appId', in: 'query', required: true, schema: { type: 'string' } },
            { name: 'appName', in: 'query', schema: { type: 'string' } },
            { name: 'category', in: 'query', schema: { type: 'string' } },
            { name: 'platform', in: 'query', schema: { type: 'string', enum: ['ios', 'android'], default: 'ios' } },
          ],
          responses: {
            '200': { description: 'Executive sentiment breakdown, Top 3 reported issues, star distribution, and opportunity analysis.' },
          },
        },
      },
    },
  };

  return NextResponse.json(openApiSpec);
}
