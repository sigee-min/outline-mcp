import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { Blocks } from 'lucide-react';
import { ThemeSelect } from '@/components/theme-select';
import type { Locale } from '@/lib/i18n';

export function baseOptions(locale: Locale): BaseLayoutProps {
  const navTitle = (
    <span className="inline-flex items-center gap-2.5">
      <span className="inline-flex size-6 items-center justify-center rounded-md border border-fd-border bg-fd-card">
        <Blocks className="size-3.5" />
      </span>
      <span>outline-mcp</span>
    </span>
  );

  return {
    i18n: true,
    themeSwitch: {
      enabled: true,
      component: <ThemeSelect locale={locale} />,
    },
    githubUrl: 'https://github.com/sigee-min/outline-mcp',
    links: [
      {
        text: locale === 'ko' ? '사용자 가이드' : 'User Guide',
        url: `/${locale}/docs`,
      },
      {
        text: locale === 'ko' ? 'GitHub' : 'GitHub',
        url: 'https://github.com/sigee-min/outline-mcp',
      },
    ],
    nav: {
      title: navTitle,
      url: `/${locale}`,
    },
  };
}
