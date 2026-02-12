import Link from 'next/link';
import { ArrowRight, CheckCircle2, Github } from 'lucide-react';
import type { LandingCopy } from '@/lib/content/landing';
import type { Locale } from '@/lib/i18n';
import { ScrollReveal } from '@/components/landing/scroll-reveal';

type LandingPageProps = {
  locale: Locale;
  copy: LandingCopy;
};

function splitHeroTitle(title: string): [string, string] {
  const raw = title.trim();
  if (!raw) return ['', ''];

  const explicitLines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (explicitLines.length >= 2) {
    return [explicitLines[0], explicitLines.slice(1).join(' ')];
  }

  const normalized = raw.replace(/\s+/g, ' ');
  const words = normalized.split(' ');
  if (words.length < 2) return [normalized, ''];

  const targetChars = Math.round(normalized.length * 0.44);
  let splitIndex = 1;
  let charCount = 0;

  for (let index = 0; index < words.length - 1; index += 1) {
    charCount += words[index].length + 1;
    if (charCount >= targetChars) {
      splitIndex = index + 1;
      break;
    }
  }

  const firstLine = words.slice(0, splitIndex).join(' ');
  const secondLine = words.slice(splitIndex).join(' ');
  return [firstLine, secondLine];
}

const detailsByLocale = {
  en: {
    statusBadge: 'Production Ready',
    policyTitle: 'Operational Principles',
    policyItems: [
      'Keep permissions explicit: read-only agents should never receive write/delete capabilities.',
      'Use safe_update_document or lease flows for any concurrent edit path.',
      'Prefer temporary resources during validation to avoid impact on live collections.',
    ],
    quickTitle: 'Start Here',
    quickDescription:
      'Follow these pages in order for first-time setup and team rollout.',
    quickLinks: [
      { title: 'Getting Started', href: '/docs/users/getting-started' },
      { title: 'Installation', href: '/docs/users/installation' },
      { title: 'MCP Client Setup', href: '/docs/users/mcp-client-setup' },
      { title: 'Tool Reference', href: '/docs/users/tool-reference' },
    ],
    openLabel: 'Open',
    githubLabel: 'GitHub',
    installHref: '/docs/users/installation',
  },
  ko: {
    statusBadge: 'Production Ready',
    policyTitle: '운영 원칙',
    policyItems: [
      '권한은 명시적으로 제한하세요: read-only 에이전트에 write/delete를 노출하지 않습니다.',
      '동시 수정 경로에서는 safe_update_document 또는 lease 흐름을 기본으로 사용하세요.',
      '검증 단계에서는 임시 리소스를 우선 사용해 운영 컬렉션 영향도를 낮추세요.',
    ],
    quickTitle: '바로 시작하기',
    quickDescription:
      '처음 도입할 때는 아래 문서를 순서대로 진행하는 것을 권장합니다.',
    quickLinks: [
      { title: '시작 가이드', href: '/docs/users/getting-started' },
      { title: '설치', href: '/docs/users/installation' },
      { title: 'MCP 클라이언트 연결', href: '/docs/users/mcp-client-setup' },
      { title: '도구 레퍼런스', href: '/docs/users/tool-reference' },
    ],
    openLabel: '열기',
    githubLabel: 'GitHub',
    installHref: '/docs/users/installation',
  },
} as const;

export function LandingPage({ locale, copy }: LandingPageProps) {
  const details = detailsByLocale[locale];
  const [heroTitleFirstLine, heroTitleSecondLine] = splitHeroTitle(copy.title);

  return (
    <div className="relative isolate flex flex-1 flex-col overflow-hidden">
      <div className="bb-landing-bg" aria-hidden>
        <div className="bb-landing-grid" />
        <div className="bb-landing-noise" />
        <div className="bb-landing-beam" />
        <div className="bb-landing-orb bb-landing-orb-a" />
        <div className="bb-landing-orb bb-landing-orb-b" />
        <div className="bb-landing-orb bb-landing-orb-c" />
      </div>

      <main className="relative mx-auto flex w-full max-w-5xl flex-1 flex-col gap-12 px-6 pt-16 pb-14 sm:px-10 lg:gap-16">
        <section className="space-y-8">
          <p className="inline-flex rounded-full border border-fd-primary/40 bg-fd-primary/12 px-3 py-1 text-xs font-semibold uppercase tracking-[0.15em] text-fd-primary">
            {copy.badge}
          </p>
          <h1 className="max-w-4xl break-keep text-4xl font-semibold leading-[1.02] tracking-tight sm:text-5xl md:text-6xl">
            <span className="block whitespace-nowrap max-sm:whitespace-normal">{heroTitleFirstLine}</span>
            {heroTitleSecondLine ? (
              <span className="mt-1 block whitespace-nowrap max-sm:whitespace-normal">
                {heroTitleSecondLine}
              </span>
            ) : null}
          </h1>
          <p className="max-w-3xl text-pretty text-base leading-relaxed text-fd-muted-foreground sm:text-lg">
            {copy.description}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={`/${locale}/docs`}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-fd-primary px-5 py-2.5 text-sm font-semibold text-fd-primary-foreground transition-all hover:bg-fd-primary/90 hover:shadow-[var(--bb-cta-shadow)]"
            >
              {copy.primaryCta}
              <ArrowRight className="size-4" />
            </Link>
            <Link
              href={`/${locale}${details.installHref}`}
              className="inline-flex items-center justify-center rounded-lg border border-fd-border/90 bg-fd-card/75 px-5 py-2.5 text-sm font-semibold transition-colors hover:bg-fd-accent hover:text-fd-accent-foreground"
            >
              {copy.secondaryCta}
            </Link>
            <a
              href="https://github.com/sigee-min/outline-mcp"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-fd-border/90 bg-fd-background/70 px-5 py-2.5 text-sm font-semibold transition-colors hover:bg-fd-accent hover:text-fd-accent-foreground"
            >
              <Github className="size-4" />
              <span>{details.githubLabel}</span>
            </a>
          </div>
        </section>

        <section className="space-y-5">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{copy.featureTitle}</h2>
          </div>
          <ScrollReveal delayMs={60}>
            <div className="grid gap-4 sm:grid-cols-2">
              {copy.features.map((feature) => (
                <article
                  key={feature.title}
                  className="bb-surface-card rounded-2xl border border-fd-border/70 p-5 backdrop-blur-md"
                >
                  <p className="text-sm font-semibold">{feature.title}</p>
                  <p className="mt-2 text-sm leading-relaxed text-fd-muted-foreground">
                    {feature.description}
                  </p>
                </article>
              ))}
            </div>
          </ScrollReveal>
        </section>

        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-fd-muted-foreground">{copy.workflowTitle}</p>
            <span className="inline-flex rounded-full border border-fd-primary/35 bg-fd-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-fd-primary">
              {details.statusBadge}
            </span>
          </div>
          <ScrollReveal delayMs={80}>
            <div className="bb-surface-card rounded-2xl border border-fd-border/70 p-6 backdrop-blur-md">
              <ol className="space-y-4">
                {copy.workflowSteps.map((step, index) => (
                  <li key={step.title} className="relative flex gap-4 pl-1">
                    {index < copy.workflowSteps.length - 1 ? (
                      <span className="absolute left-[14px] top-7 h-[calc(100%-3px)] w-px bg-fd-border/90" />
                    ) : null}
                    <span className="relative z-10 mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full border border-fd-primary/20 bg-fd-primary/10 text-xs font-semibold text-fd-primary">
                      {index + 1}
                    </span>
                    <div>
                      <p className="text-sm font-semibold">{step.title}</p>
                      <p className="mt-1 text-sm text-fd-muted-foreground">{step.description}</p>
                    </div>
                  </li>
                ))}
              </ol>

              <div className="mt-6 rounded-xl border border-fd-border/70 bg-fd-background/75 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-fd-primary">
                  {details.policyTitle}
                </p>
                <ul className="mt-3 space-y-2">
                  {details.policyItems.map((item) => (
                    <li key={item} className="flex items-start gap-2.5">
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-fd-primary" />
                      <span className="text-sm text-fd-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </ScrollReveal>
        </section>

        <section className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{details.quickTitle}</h2>
            <p className="max-w-3xl text-sm leading-relaxed text-fd-muted-foreground sm:text-base">
              {details.quickDescription}
            </p>
          </div>
          <ScrollReveal delayMs={100}>
            <div className="grid gap-4 sm:grid-cols-2">
              {details.quickLinks.map((link) => (
                <Link
                  key={link.href}
                  href={`/${locale}${link.href}`}
                  className="group rounded-2xl border border-fd-border/70 bg-fd-card/70 p-5 transition-all hover:-translate-y-0.5 hover:border-fd-primary/40 hover:shadow-[var(--bb-feature-hover-shadow)]"
                >
                  <p className="text-sm font-semibold">{link.title}</p>
                  <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-fd-primary">
                    {details.openLabel}
                    <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                  </p>
                </Link>
              ))}
            </div>
          </ScrollReveal>
        </section>

        <section className="space-y-3 pb-3">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{copy.closingTitle}</h2>
          <p className="max-w-3xl text-sm leading-relaxed text-fd-muted-foreground sm:text-base">
            {copy.closingDescription}
          </p>
        </section>
      </main>
    </div>
  );
}
