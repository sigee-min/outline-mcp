import Link from 'next/link';
import { Blocks, BookText, Github, Home, Wrench } from 'lucide-react';
import type { Locale } from '@/lib/i18n';

type SiteFooterProps = {
  locale: Locale;
};

const copyByLocale = {
  en: {
    product: 'Product',
    resources: 'Resources',
    docs: 'Docs',
    home: 'Home',
    install: 'Install',
    tools: 'Tool Reference',
    issues: 'Issues',
    releases: 'Releases',
    tagline: 'Production-focused MCP server for Outline teams and agent workflows.',
    installHref: '/docs/users/installation',
    toolsHref: '/docs/users/tool-reference',
  },
  ko: {
    product: 'Product',
    resources: 'Resources',
    docs: '문서',
    home: '홈',
    install: '설치',
    tools: '도구 레퍼런스',
    issues: '이슈',
    releases: '릴리즈',
    tagline: 'Outline 팀과 에이전트 워크플로를 위한 프로덕션 지향 MCP 서버.',
    installHref: '/docs/users/installation',
    toolsHref: '/docs/users/tool-reference',
  },
} as const;

export function SiteFooter({ locale }: SiteFooterProps) {
  const copy = copyByLocale[locale];
  const githubUrl = 'https://github.com/sigee-min/outline-mcp';

  return (
    <footer className="bb-site-footer mt-auto border-t border-fd-border/80">
      <div className="mx-auto w-full max-w-6xl px-6 py-10 sm:px-10 sm:py-12">
        <div className="grid gap-8 md:grid-cols-[1.45fr_1fr_1fr]">
          <div className="space-y-3">
            <Link href={`/${locale}`} className="inline-flex items-center gap-2.5 text-base font-semibold">
              <span className="inline-flex size-[42px] items-center justify-center rounded-lg border border-fd-border bg-fd-card">
                <Blocks className="size-5" />
              </span>
              <span>outline-mcp</span>
            </Link>
            <p className="max-w-sm text-sm leading-relaxed text-fd-muted-foreground">{copy.tagline}</p>
            <p className="text-xs text-fd-muted-foreground">github.com/sigee-min/outline-mcp</p>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-fd-muted-foreground">
              {copy.product}
            </p>
            <div className="flex flex-col gap-2 text-sm">
              <Link
                href={`/${locale}`}
                className="inline-flex items-center gap-2 text-fd-muted-foreground transition-colors hover:text-fd-foreground"
              >
                <Home className="size-4" />
                <span>{copy.home}</span>
              </Link>
              <Link
                href={`/${locale}/docs`}
                className="inline-flex items-center gap-2 text-fd-muted-foreground transition-colors hover:text-fd-foreground"
              >
                <BookText className="size-4" />
                <span>{copy.docs}</span>
              </Link>
              <Link
                href={`/${locale}${copy.installHref}`}
                className="inline-flex items-center gap-2 text-fd-muted-foreground transition-colors hover:text-fd-foreground"
              >
                <Wrench className="size-4" />
                <span>{copy.install}</span>
              </Link>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-fd-muted-foreground">
              {copy.resources}
            </p>
            <div className="flex flex-col gap-2 text-sm">
              <Link
                href={`/${locale}${copy.toolsHref}`}
                className="text-fd-muted-foreground transition-colors hover:text-fd-foreground"
              >
                {copy.tools}
              </Link>
              <a
                href={`${githubUrl}/issues`}
                target="_blank"
                rel="noreferrer"
                className="text-fd-muted-foreground transition-colors hover:text-fd-foreground"
              >
                {copy.issues}
              </a>
              <a
                href={`${githubUrl}/releases`}
                target="_blank"
                rel="noreferrer"
                className="text-fd-muted-foreground transition-colors hover:text-fd-foreground"
              >
                {copy.releases}
              </a>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-fd-border/70 pt-5 text-xs text-fd-muted-foreground">
          <p>© {new Date().getFullYear()} MINSEOK CHOI. Licensed under the MIT License.</p>
          <a
            href={githubUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 transition-colors hover:text-fd-foreground"
          >
            <Github className="size-3.5" />
            <span>GitHub</span>
          </a>
        </div>
      </div>
    </footer>
  );
}
