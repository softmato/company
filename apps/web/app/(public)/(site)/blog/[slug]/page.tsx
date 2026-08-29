import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { getPost, publishedSlugs } from '@/lib/cms/public-queries';
import { metadataFor } from '@/lib/cms/metadata';
import { breadcrumbList } from '@/lib/seo/breadcrumbs';
import { blogPostingNode } from '@/lib/seo/content';
import { JsonLd } from '@/lib/seo/json-ld';
import { formatBsWithAd } from '@/lib/format/date';
import { CmsImageFill } from '@/components/public/cms-image';
import { Markdown } from '@/components/public/markdown';
import { PageHeader } from '@/components/public/page-header';

export async function generateStaticParams() {
  const slugs = await publishedSlugs('blog');
  return slugs.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps<'/blog/[slug]'>): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);

  /*
   * `type: 'article'` rather than the default website: it is what puts the
   * published and modified times into the preview card, which is most of what
   * makes a shared post look current rather than undated.
   */
  return post
    ? metadataFor(post, {
        path: `/blog/${slug}`,
        type: 'article',
        publishedTime: post.publishedAt,
        modifiedTime: post.updatedAt,
      })
    : { title: 'Not found' };
}

export default async function BlogPostPage({
  params,
}: PageProps<'/blog/[slug]'>) {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post) notFound();

  return (
    <article>
      <JsonLd
        id="breadcrumbs"
        data={breadcrumbList([
          { name: 'Blog', path: '/blog' },
          { name: post.title },
        ])}
      />
      <JsonLd id="post" data={blogPostingNode(post)} />

      <PageHeader
        eyebrow={
          post.publishedAt ? formatBsWithAd(post.publishedAt) : undefined
        }
        title={post.title}
        lead={post.excerpt}
      />

      {post.coverImageUrl ? (
        /*
         * A 16:9 frame, so the space is reserved before the image arrives and
         * the article text below it does not jump. A cover is decorative, so
         * cropping to the ratio is the right trade; a screenshot is not, which
         * is why the product page contains its image instead.
         */
        <div className="relative mt-8 aspect-[16/9] overflow-hidden rounded-lg border border-border">
          <CmsImageFill
            src={post.coverImageUrl}
            alt=""
            sizes="(max-width: 768px) 100vw, 720px"
            className="object-cover"
          />
        </div>
      ) : null}

      <Markdown>{post.body}</Markdown>

      {post.tags.length > 0 ? (
        <ul className="mt-10 flex flex-wrap gap-2">
          {post.tags.map((tag) => (
            <li
              key={tag}
              className="rounded-sm bg-muted px-2 py-1 text-xs text-muted-foreground"
            >
              {tag}
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}
