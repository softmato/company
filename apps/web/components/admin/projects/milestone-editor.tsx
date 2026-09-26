import { addMilestoneAction } from '@/app/(admin)/admin/projects/actions/add-milestone';
import { deleteMilestoneAction } from '@/app/(admin)/admin/projects/actions/delete-milestone';
import { toggleMilestoneAction } from '@/app/(admin)/admin/projects/actions/toggle-milestone';
import { ActionForm } from '@/components/admin/clients/action-form';
import { SubmitButton } from '@/components/admin/submit-button';
import { MilestoneList } from '@/components/projects/milestone-list';
import { Input } from '@/components/ui/input';
import type { MilestoneView } from '@/lib/projects/bundle';

export function MilestoneEditor({
  projectId,
  milestones,
}: {
  projectId: number;
  milestones: MilestoneView[];
}) {
  return (
    <div className="space-y-4">
      <MilestoneList
        milestones={milestones}
        action={(m) => (
          <div className="flex gap-1">
            <ActionForm action={toggleMilestoneAction}>
              <input type="hidden" name="milestoneId" value={m.id} />
              <input
                type="hidden"
                name="reached"
                value={String(m.completedAt === null)}
              />
              <SubmitButton variant="ghost" size="sm" pendingLabel="…">
                {m.completedAt ? 'Reopen' : 'Mark reached'}
              </SubmitButton>
            </ActionForm>
            <ActionForm
              action={deleteMilestoneAction}
              confirm={`Remove “${m.title}”?`}
            >
              <input type="hidden" name="milestoneId" value={m.id} />
              <SubmitButton
                variant="ghost"
                size="sm"
                pendingLabel="…"
                aria-label={`Remove ${m.title}`}
              >
                ✕
              </SubmitButton>
            </ActionForm>
          </div>
        )}
      />

      <ActionForm
        action={addMilestoneAction}
        resetOnSuccess
        className="grid gap-2 border-t border-border pt-4 sm:grid-cols-[1fr_10rem_auto] sm:items-end"
      >
        <input type="hidden" name="projectId" value={projectId} />
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Milestone</span>
          <Input
            name="title"
            required
            maxLength={200}
            placeholder="e.g. Staging site ready"
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Date</span>
          <Input name="dueOn" type="date" />
        </label>
        <SubmitButton variant="secondary" pendingLabel="Adding…">
          Add
        </SubmitButton>
      </ActionForm>
    </div>
  );
}
