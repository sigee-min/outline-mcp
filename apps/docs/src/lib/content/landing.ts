import type { Locale } from '@/lib/i18n';

export type LandingCopy = {
  badge: string;
  title: string;
  description: string;
  primaryCta: string;
  secondaryCta: string;
  featureTitle: string;
  features: Array<{
    title: string;
    description: string;
  }>;
  workflowTitle: string;
  workflowSteps: Array<{
    title: string;
    description: string;
  }>;
  closingTitle: string;
  closingDescription: string;
};

const contentByLocale: Record<Locale, LandingCopy> = {
  en: {
    badge: 'Outline MCP User Guide',
    title: 'Run Outline with MCP.\nCloud and self-hosted, one workflow.',
    description:
      'outline-mcp is a production-focused MCP server for Outline workspaces. Configure once, connect your MCP client, and operate with explicit read/write/delete controls.',
    primaryCta: 'Open Docs',
    secondaryCta: 'Install',
    featureTitle: 'Built for real agent workflows',
    features: [
      {
        title: 'Permission-first runtime',
        description:
          'Restrict capabilities with OUTLINE_ALLOWED_ACTIONS so each agent only sees and runs what it should.',
      },
      {
        title: 'Cloud + self-hosted',
        description:
          'Switch endpoints with OUTLINE_BASE_URL. Keep the same tools and contracts across environments.',
      },
      {
        title: 'Safe concurrency',
        description:
          'Use safe_update_document and lease tools to avoid silent overwrites in multi-agent collaboration.',
      },
      {
        title: 'Operationally complete',
        description:
          'Collections, documents, templates, comments, memberships, and export flows are all documented and available.',
      },
    ],
    workflowTitle: 'From setup to production usage',
    workflowSteps: [
      {
        title: 'Install and connect',
        description: 'Add @sigeemin/outline-mcp to your MCP client using npx or global install.',
      },
      {
        title: 'Apply environment policy',
        description:
          'Set API key, endpoint, and allowed actions to match your trust boundary and deployment model.',
      },
      {
        title: 'Run guided operations',
        description:
          'Use user guides for collection/document workflows, membership operations, and export processing.',
      },
      {
        title: 'Validate with E2E',
        description:
          'Run Inspector scenarios with isolated temp collections to verify behavior before team rollout.',
      },
    ],
    closingTitle: 'Ship fast, operate safely.',
    closingDescription:
      'Start with the installation guide, then move to tool reference and multi-agent operations for production.',
  },
  ko: {
    badge: 'Outline MCP 사용자 가이드',
    title: 'Outline를 MCP로 운영하세요.\nCloud와 Self-hosted를 하나의 흐름으로.',
    description:
      'outline-mcp는 Outline 워크스페이스를 위한 프로덕션 지향 MCP 서버입니다. 한 번 설정하면 MCP 클라이언트에서 동일한 권한 모델로 운영할 수 있습니다.',
    primaryCta: '문서 보기',
    secondaryCta: '설치하기',
    featureTitle: '실제 에이전트 운영을 위한 설계',
    features: [
      {
        title: '권한 우선 런타임',
        description:
          'OUTLINE_ALLOWED_ACTIONS로 기능을 제한해 에이전트별 허용 범위를 명확히 통제할 수 있습니다.',
      },
      {
        title: 'Cloud + self-hosted 동시 지원',
        description:
          'OUTLINE_BASE_URL만 바꾸면 동일한 도구/계약으로 환경을 전환할 수 있습니다.',
      },
      {
        title: '동시성 안전성',
        description:
          'safe_update_document와 lease 도구로 멀티 에이전트 편집 충돌을 예방합니다.',
      },
      {
        title: '운영에 필요한 기능 세트',
        description:
          '컬렉션, 문서, 템플릿, 댓글, 멤버십, export까지 실사용 기능을 문서와 함께 제공합니다.',
      },
    ],
    workflowTitle: '설치부터 운영까지',
    workflowSteps: [
      {
        title: '설치 및 연결',
        description: 'npx 또는 글로벌 설치로 @sigeemin/outline-mcp를 MCP 클라이언트에 연결합니다.',
      },
      {
        title: '환경 정책 적용',
        description: 'API 키, 엔드포인트, 허용 액션을 운영 정책에 맞게 설정합니다.',
      },
      {
        title: '가이드 기반 운영',
        description: '컬렉션/문서/멤버십/export 흐름을 사용자 가이드대로 실행합니다.',
      },
      {
        title: 'E2E 검증',
        description: '임시 컬렉션 기반 Inspector 시나리오로 배포 전 동작을 검증합니다.',
      },
    ],
    closingTitle: '빠르게 배포하고, 안전하게 운영하세요.',
    closingDescription:
      '설치 가이드부터 시작해 도구 레퍼런스와 멀티 에이전트 운영 문서로 확장하면 됩니다.',
  },
};

export function getLandingCopy(locale: Locale): LandingCopy {
  return contentByLocale[locale];
}
