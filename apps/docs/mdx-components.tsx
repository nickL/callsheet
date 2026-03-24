import * as StepsComponents from 'fumadocs-ui/components/steps';
import * as TabsComponents from 'fumadocs-ui/components/tabs';
import defaultComponents from 'fumadocs-ui/mdx';

import type { MDXComponents } from 'mdx/types';

export function useMDXComponents(components: MDXComponents): MDXComponents {
  const baseComponents = defaultComponents as MDXComponents;

  return {
    ...baseComponents,
    ...StepsComponents,
    ...TabsComponents,
    ...components,
  };
}
