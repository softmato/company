import {
  publishContent,
  unpublishContent,
} from '@/app/(admin)/admin/cms/actions/publish';
import { Badge } from '@/components/ui/badge';
import {
  PublishConfirm,
  PublishPending,
} from '@/components/admin/publish-confirm';

/**
 * Publish / unpublish, kept apart from the edit form.
 *
 * Saving and publishing are different acts. Merging them into one button is
 * how a half-written draft reaches the public site.
 */
export function PublicationPanel({
  kindSlug,
  id,
  title,
  published,
}: {
  kindSlug: string;
  id: number;
  title: string;
  published: boolean;
}) {
  return (
    <section className="mt-8 border-t border-border pt-5">
      <div className="flex items-center gap-2.5">
        <h2 className="text-sm font-medium">Publication</h2>
        <Badge status={published ? 'published' : 'draft'}>
          {published ? 'Published' : 'Draft'}
        </Badge>
      </div>

      <p className="mt-1.5 max-w-[68ch] text-sm text-muted-foreground">
        {published
          ? 'This is live on the public site. Saving an edit changes it immediately.'
          : 'This is a draft and is not visible on the public site.'}
      </p>

      <form
        action={published ? unpublishContent : publishContent}
        className="mt-3.5 flex items-center gap-3"
      >
        <input type="hidden" name="kind" value={kindSlug} />
        <input type="hidden" name="id" value={id} />
        <PublishConfirm published={published} title={title} />
        <PublishPending />
      </form>
    </section>
  );
}
