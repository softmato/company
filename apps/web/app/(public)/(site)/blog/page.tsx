import type { Metadata } from 'next';

import { getPage, listPublishedPosts } from '@/lib/cms/public-queries';
import { metadataFor } from '@/lib/cms/metadata';
import { breadcrumbList } from '@/lib/seo/breadcrumbs';
import { collectionPageNode } from '@/lib/seo/content';
import { JsonLd } from '@/lib/seo/json-ld';
import { formatBs } from '@/lib/format/date';
import { PageHeader } from '@/components/public/page-header';
import { PostList } from '@/components/public/blog/post-list';

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPage('blog');
  return page ? metadataFor(page, { path: '/blog' }) : { title: 'Blog' };
}

export default async function BlogIndexPage() {
  const [posts, page] = await Promise.all([
    listPublishedPosts(),
    getPage('blog'),
  ]);

  return (
    <div>
      <JsonLd id="breadcrumbs" data={breadcrumbList([{ name: 'Blog' }])} />
      <JsonLd
        id="page"
        data={collectionPageNode({
          path: '/blog',
          name: page?.metaTitle ?? 'Blog',
          description: page?.metaDescription,
          items: posts.map((post) => ({
            name: post.title,
            path: `/blog/${post.slug}`,
          })),
        })}
      />

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
