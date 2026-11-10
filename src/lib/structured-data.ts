/**
 * schema.org data. Only facts the project publishes: no ratings, reviews or
 * download counts.
 */
import { links, site } from '../data/site';
import type { Release } from './releases';

export function softwareApplication(latest: Release | null): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: site.name,
    description: site.description,
    url: site.url + '/',
    applicationCategory: 'DesktopEnhancementApplication',
    operatingSystem: 'Linux, Windows',
    license: site.license.url,
    isAccessibleForFree: true,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
    image: new URL(site.ogImage.path, site.url).href,
    sameAs: [links.repo],
    downloadUrl: `${site.url}/download/`,
    ...(latest
      ? {
          softwareVersion: latest.version,
          datePublished: latest.publishedAt.slice(0, 10),
          releaseNotes: latest.url,
        }
      : {}),
  };
}

export function breadcrumbs(items: { name: string; path: string }[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: new URL(item.path, site.url).href,
    })),
  };
}
