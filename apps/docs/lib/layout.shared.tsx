import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: (
        <span className="inline-flex items-center gap-2">
          <img
            src="/brand/callsheet-logo.svg"
            alt=""
            aria-hidden="true"
            className="h-7 w-auto"
          />
          <span>Callsheet</span>
        </span>
      ),
    },
  };
}
