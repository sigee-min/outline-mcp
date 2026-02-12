import { redirect } from 'next/navigation';
import { withBasePath } from '@/lib/site';

type LegacyDocsRedirectProps = {
  params: Promise<{
    slug?: string[];
  }>;
};

export default async function LegacyDocsRedirect({ params }: LegacyDocsRedirectProps) {
  const { slug } = await params;
  const suffix = slug && slug.length > 0 ? `/${slug.join('/')}` : '';
  redirect(withBasePath(`/en/docs${suffix}`));
}
