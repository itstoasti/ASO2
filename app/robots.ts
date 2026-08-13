import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
      },
      {
        userAgent: ['GPTBot', 'ChatGPT-User', 'ClaudeBot', 'Google-Extended', 'GrokBot'],
        allow: '/',
      },
    ],
    sitemap: 'https://aso-keyword-research.app/sitemap.xml',
  };
}
