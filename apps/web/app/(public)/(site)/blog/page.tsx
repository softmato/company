import type { Metadata } from 'next';

import { getPage, listPublishedPosts } from '@/lib/cms/public-queries';
import { metadataFor } from '@/lib/cms/metadata';
import { formatBs } from '@/lib/format/date';
import { CardList } from '@/components/public/card-list';
import { PageHeader } from '@/components/public/page-header';

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPage('blog');
  return page ? metadataFor(page) : { title: 'Blog' };
}

export default async function BlogIndexPage() {
  const posts = await listPublishedPosts();

  return (
    <div>
      <PageHeader title="Blog" />

      <CardList
        empty="No posts yet."
        items={posts.map((post) => ({
          key: String(post.id),
          href: `/blog/${post.slug}`,
          title: post.title,
          description: post.excerpt,
          meta: post.publishedAt ? formatBs(post.publishedAt) : null,
        }))}
      />
    </div>
  );
}
