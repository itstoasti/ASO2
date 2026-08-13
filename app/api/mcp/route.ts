import { NextRequest, NextResponse } from 'next/server';
import {
  executeKeywordResearch,
  executeRankCheck,
  executeAppLookup,
  executeExtractKeywords,
} from '@/lib/mcp/aso-tools';

export const dynamic = 'force-dynamic';

const MCP_TOOLS = [
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
];

/**
 * GET /api/mcp - MCP Server Info & Capabilities discovery
 */
export async function GET() {
  return NextResponse.json({
    name: 'aso-keyword-research-mcp-server',
    version: '1.0.0',
    protocolVersion: '2024-11-05',
    capabilities: {
      tools: MCP_TOOLS,
    },
    status: 'online',
    documentation: '/llms.txt',
  });
}

/**
 * POST /api/mcp - JSON-RPC 2.0 MCP Request Handler
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { jsonrpc, id, method, params } = body;

    // Handle standard JSON-RPC 2.0 requests
    if (method === 'initialize') {
      return NextResponse.json({
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: {
            name: 'aso-keyword-research-server',
            version: '1.0.0',
          },
        },
      });
    }

    if (method === 'tools/list') {
      return NextResponse.json({
        jsonrpc: '2.0',
        id,
        result: {
          tools: MCP_TOOLS,
        },
      });
    }

    if (method === 'tools/call') {
      const { name, arguments: args = {} } = params || {};

      let resultData: any = null;

      if (name === 'research_keywords') {
        resultData = await executeKeywordResearch(args);
      } else if (name === 'check_app_rankings') {
        resultData = await executeRankCheck(args);
      } else if (name === 'lookup_app_details') {
        resultData = await executeAppLookup(args);
      } else if (name === 'extract_app_keywords') {
        resultData = await executeExtractKeywords(args);
      } else {
        return NextResponse.json(
          {
            jsonrpc: '2.0',
            id,
            error: {
              code: -32601,
              message: `Method or tool '${name}' not found.`,
            },
          },
          { status: 404 }
        );
      }

      return NextResponse.json({
        jsonrpc: '2.0',
        id,
        result: {
          content: [
            {
              type: 'text',
              text: JSON.stringify(resultData, null, 2),
            },
          ],
        },
      });
    }

    return NextResponse.json(
      {
        jsonrpc: '2.0',
        id,
        error: {
          code: -32601,
          message: `Unsupported method: ${method}`,
        },
      },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Error handling /api/mcp request:', error);
    return NextResponse.json(
      {
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: error?.message || 'Internal MCP Server error',
        },
      },
      { status: 500 }
    );
  }
}
