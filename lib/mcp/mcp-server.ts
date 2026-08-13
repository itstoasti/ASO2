import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import {
  executeKeywordResearch,
  executeRankCheck,
  executeAppLookup,
  executeExtractKeywords,
} from './aso-tools';

/**
 * Creates and configures an MCP Server instance for ASO Keyword Research & Rank Tracking.
 */
export function createAsoMcpServer() {
  const server = new Server(
    {
      name: 'aso-keyword-research-server',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: 'research_keywords',
          description:
            'Performs App Store and Google Play Store ASO keyword research. Returns search popularity (5-100), estimated impressions, difficulty score (0-100), opportunity score, and top competitors.',
          inputSchema: {
            type: 'object',
            properties: {
              seedKeyword: {
                type: 'string',
                description: 'Seed keyword or topic to expand (e.g. "fitness tracker", "budget planner")',
              },
              platform: {
                type: 'string',
                enum: ['ios', 'android', 'both'],
                description: 'Target platform. Defaults to "both".',
              },
              country: {
                type: 'string',
                description: 'Two-letter ISO country code (e.g. "us", "gb", "ca", "de"). Defaults to "us".',
              },
              appUrl: {
                type: 'string',
                description: 'Optional App Store or Play Store link to extract seed terms from.',
              },
              websiteUrl: {
                type: 'string',
                description: 'Optional developer website URL to extract seed terms from.',
              },
            },
          },
        },
        {
          name: 'check_app_rankings',
          description:
            'Tracks app search rank position (1-50) in App Store / Play Store for a given array of keywords, alongside keyword difficulty and top competitor apps.',
          inputSchema: {
            type: 'object',
            properties: {
              appId: {
                type: 'string',
                description: 'App ID (e.g. numeric iTunes ID "389801252" or Google Play package "com.spotify.music" or developer name)',
              },
              keywords: {
                type: 'array',
                items: { type: 'string' },
                description: 'Array of keywords to test rank position for.',
              },
              platform: {
                type: 'string',
                enum: ['ios', 'android'],
                description: 'Target store platform ("ios" or "android"). Defaults to "ios".',
              },
              country: {
                type: 'string',
                description: 'Country code (e.g. "us", "gb"). Defaults to "us".',
              },
            },
            required: ['appId', 'keywords'],
          },
        },
        {
          name: 'lookup_app_details',
          description:
            'Resolves iOS App Store numeric ID or Android Package Name to detailed metadata including app title, developer name, and icon artwork.',
          inputSchema: {
            type: 'object',
            properties: {
              appId: {
                type: 'string',
                description: 'App numeric ID, URL, or package identifier.',
              },
              platform: {
                type: 'string',
                enum: ['ios', 'android'],
                description: 'Target platform ("ios" or "android"). Defaults to "ios".',
              },
              country: {
                type: 'string',
                description: 'Country code (e.g. "us"). Defaults to "us".',
              },
            },
            required: ['appId'],
          },
        },
        {
          name: 'extract_app_keywords',
          description:
            'Extracts seed keyword candidates from an app store URL, website URL, or app title/description.',
          inputSchema: {
            type: 'object',
            properties: {
              targetUrl: {
                type: 'string',
                description: 'App store listing URL or developer website URL.',
              },
            },
            required: ['targetUrl'],
          },
        },
      ],
    };
  });

  // Call tool request handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      if (name === 'research_keywords') {
        const result = await executeKeywordResearch(args || {});
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      if (name === 'check_app_rankings') {
        const result = await executeRankCheck(args as any);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      if (name === 'lookup_app_details') {
        const result = await executeAppLookup(args as any);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      if (name === 'extract_app_keywords') {
        const result = await executeExtractKeywords(args as any);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      throw new Error(`Unknown MCP Tool: ${name}`);
    } catch (err: any) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ error: err?.message || 'Tool execution failed' }),
          },
        ],
        isError: true,
      };
    }
  });

  return server;
}
