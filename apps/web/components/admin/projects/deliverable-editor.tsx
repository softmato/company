import { addDeliverableAction } from '@/app/(admin)/admin/projects/actions/add-deliverable';
import { deleteDeliverableAction } from '@/app/(admin)/admin/projects/actions/delete-deliverable';
import { updateDeliverableAction } from '@/app/(admin)/admin/projects/actions/update-deliverable';
import { ActionForm } from '@/components/admin/clients/action-form';
import { SubmitButton } from '@/components/admin/submit-button';
import { DeliverableCard } from '@/components/projects/deliverable-card';
import { Input, Textarea } from '@/components/ui/input';
import type { DeliverableView } from '@/lib/projects/bundle';
import {
  DELIVERABLE_ADMIN_LABEL,
  DELIVERABLE_STATUSES,
} from '@/lib/projects/labels';

import { Select } from './select';

/**
 * Each deliverable as the client sees it, with an "Edit" disclosure under it.
 * Setting one to "With client for review" is what puts the Approve button in
 * front of the client.
 */
export function DeliverableEditor({
  projectId,
  deliverables,
}: {
  projectId: number;
  deliverables: DeliverableView[];
}) {
  return (
    <div className="space-y-3">
      {deliverables.map((d) => (
        <DeliverableCard key={d.id} deliverable={d} side="admin">
          <details className="mt-3 border-t border-border pt-3">
            <summary className="cursor-pointer text-[13px] font-medium text-muted-foreground hover:text-foreground">
              Edit
            </summary>
            <ActionForm
              action={updateDeliverableAction}
              className="mt-3 grid gap-2"
            >
              <input type="hidden" name="deliverableId" value={d.id} />
              <div className="grid gap-2 sm:grid-cols-[1fr_14rem]">
                <Input
                  name="title"
                  defaultValue={d.title}
                  aria-label="Title"
                  required
                  maxLength={200}
                />
                <Select
                  name="status"
                  defaultValue={d.status}
                  aria-label="Status"
                >
                  {DELIVERABLE_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {DELIVERABLE_ADMIN_LABEL[s]}
                    </option>
                  ))}
                </Select>
              </div>
              <Textarea
                name="description"
                defaultValue={d.description}
                aria-label="Description"
                rows={2}
                maxLength={2000}
              />
              <Input
                name="linkUrl"
                type="url"
                defaultValue={d.linkUrl ?? ''}
                aria-label="Link"
                placeholder="https://"
              />
              <div>
                <SubmitButton
                  variant="secondary"
                  size="sm"
                  pendingLabel="Saving…"
                >
                  Save
                </SubmitButton>
              </div>
            </ActionForm>
            <ActionForm
              action={deleteDeliverableAction}
              confirm={`Remove “${d.title}”?`}
              className="mt-2"
            >
              <input type="hidden" name="deliverableId" value={d.id} />
              <SubmitButton
                variant="ghost"
                size="sm"
                pendingLabel="Removing…"
                className="text-destructive"
              >
                Remove deliverable
              </SubmitButton>
            </ActionForm>
          </details>
        </DeliverableCard>
      ))}

      <ActionForm
        action={addDeliverableAction}
        resetOnSuccess
        className="grid gap-2 rounded-lg border border-dashed border-border p-3"
      >
        <input type="hidden" name="projectId" value={projectId} />
        <p className="text-sm font-medium">Add a deliverable</p>
        <Input
          name="title"
          required
          maxLength={200}
          placeholder="What it is, e.g. Homepage design"
          aria-label="Title"
        />
        <Textarea
          name="description"
          rows={2}
          maxLength={2000}
          placeholder="What the client should look at (optional)"
          aria-label="Description"
        />
        <Input
          name="linkUrl"
          type="url"
          placeholder="Link to open it — https:// (optional)"
          aria-label="Link"
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="forReview"
            className="size-4 accent-[var(--primary)]"
          />
          Ready now — ask the client to review it
        </label>
        <div>
          <SubmitButton variant="secondary" pendingLabel="Adding…">
            Add deliverable
          </SubmitButton>
        </div>
      </ActionForm>
    </div>
  );
}
