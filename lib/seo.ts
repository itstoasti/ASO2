/**
 * Generates JSON-LD Structured Data Schema for WebApplication & SoftwareApplication
 * Optimized for Search Engines (Google, Bing) and AI LLMs (ChatGPT, Gemini, Grok, Claude)
 */
export function generateJsonLdSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    'name': 'ASO Keyword Research Tool',
    'url': 'https://aso-keyword-research.app',
    'description': 'Professional App Store Optimization (ASO) keyword discovery and search popularity analytics platform for Apple App Store (iOS) and Google Play Store (Android).',
    'applicationCategory': 'DeveloperApplication',
    'operatingSystem': 'All',
    'offers': {
      '@type': 'Offer',
      'price': '0',
      'priceCurrency': 'USD',
    },
    'featureList': [
      'Official Apple Search Ads Search Popularity (5-100) metrics',
      'Continuous monthly search impression volume estimates',
      'Google Play Store Relative Estimated Demand modeling',
      'Keyword Difficulty algorithm (0-100)',
      'Custom Opportunity Score optimization formula',
      'Multi-platform iOS and Android keyword comparison',
      'CSV data export for ASO workflows',
    ],
    'creator': {
      '@type': 'Organization',
      'name': 'ASO Analytics Suite',
    },
  };
}
