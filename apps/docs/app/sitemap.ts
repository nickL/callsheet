import { siteConfig } from '../lib/metadata';
import { source } from '../lib/source';

import type { MetadataRoute } from 'next';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = source.getPages().map((page) => ({
    url: `${siteConfig.url}/${page.slugs.join('/')}`,
  }));

  return [
    {
      url: siteConfig.url,
    },
    ...pages,
  ];
}
