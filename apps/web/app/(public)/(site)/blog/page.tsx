import type { Metadata } from 'next';

import { getPage, listPublishedPosts } from '@/lib/cms/public-queries';
import { metadataFor } from '@/lib/cms/metadata';
import { formatBs } from '@/lib/format/date';
import { PageHeader } from '@/components/public/page-header';
import { PostList } from '@/components/public/blog/post-list';

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPage('blog');
  return page ? metadataFor(page) : { title: 'Blog' };
}

export default async function BlogIndexPage() {
  const posts = await listPublishedPosts();

  return (
    <div>
      <PageHeader eyebrow="Writing" title="Blog" />

      <PostList
        posts={posts.map((post) => ({
          slug: post.slug,
          title: post.title,
          excerpt: post.excerpt,
          tags: post.tags ?? [],
          date: post.publishedAt ? formatBs(post.publishedAt) : null,
          dateTime: post.publishedAt ? post.publishedAt.toISOString() : null,
        }))}
      />
    </div>
  );
}
