import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
} from 'fumadocs-ui/page';
import { notFound } from 'next/navigation';

import { source } from '../../../lib/source';
import { useMDXComponents } from '../../../mdx-components';

import type { TOCItemType } from 'fumadocs-core/toc';
import type { MDXComponents } from 'mdx/types';
import type { Metadata } from 'next';
import type { ComponentType } from 'react';

interface PageProps {
  params: Promise<{
    slug?: string[];
  }>;
}

interface DocsContentData {
  title?: string;
  description?: string;
  full?: boolean;
  toc?: TOCItemType[];
  showHeader?: boolean;
  body: ComponentType<{
    components?: MDXComponents;
  }>;
}

export const dynamicParams = false;

export function generateStaticParams() {
  return [{ slug: [] }, ...source.generateParams()];
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const resolvedSlug = slug?.length ? slug : ['introduction'];
  const page = source.getPage(resolvedSlug);

  if (!page) {
    return {};
  }

  return {
    title: page.data.title,
    description: page.data.description,
  };
}

export default async function DocsSlugPage({ params }: PageProps) {
  const { slug } = await params;
  const resolvedSlug = slug?.length ? slug : ['introduction'];
  const page = source.getPage(resolvedSlug);

  if (!page) {
    notFound();
  }

  const {
    body: MDX,
    showHeader = true,
    ...data
  } = page.data as DocsContentData;
  const mdxComponents = useMDXComponents({});
  const docsPageProps = {
    ...(data.toc ? { toc: data.toc } : {}),
    ...(data.full !== undefined ? { full: data.full } : {}),
  };

  return (
    <DocsPage
      {...docsPageProps}
      tableOfContent={{
        style: 'clerk',
      }}
    >
      {showHeader ? (
        <>
          <DocsTitle>{data.title}</DocsTitle>
          <DocsDescription>{data.description}</DocsDescription>
        </>
      ) : null}
      <DocsBody>
        <MDX components={mdxComponents} />
      </DocsBody>
    </DocsPage>
  );
}
