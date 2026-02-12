import type { MetadataRoute } from 'next';
import { withBasePath } from '@/lib/site';

export const dynamic = 'force-static';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'outline-mcp docs',
    short_name: 'outline-mcp',
    description:
      'User documentation for outline-mcp: setup, permissions, multi-agent workflows, and operations.',
    start_url: withBasePath('/en'),
    display: 'standalone',
    background_color: '#0b111b',
    theme_color: '#0b111b',
  };
}
