import { addStageAction } from '@/app/(admin)/admin/projects/actions/add-stage';
import { deleteStageAction } from '@/app/(admin)/admin/projects/actions/delete-stage';
import { moveStageAction } from '@/app/(admin)/admin/projects/actions/move-stage';
import { updateStageAction } from '@/app/(admin)/admin/projects/actions/update-stage';
import { ActionForm } from '@/components/admin/clients/action-form';
import { SubmitButton } from '@/components/admin/submit-button';
import { Input } from '@/components/ui/input';
import type { StageView } from '@/lib/projects/bundle';
import { STAGE_LABEL, STAGE_STATUSES } from '@/lib/projects/labels';

import { Select } from './select';

/**
 * Every stage as an editable row: name, one-line description, status, and
 * its place in the order. The client sees exactly this sequence.
 */
export function StageEditor({
  projectId,
  stages,
}: {
  projectId: number;
  stages: StageView[];
}) {
  return (
    <div className="space-y-3">
      {stages.map((stage, index) => (
        <div
          key={stage.id}
          className="flex gap-3 rounded-lg border border-border p-3"
        >
          <span className="mt-1.5 grid size-7 shrink-0 place-items-center rounded-full bg-surface font-mono text-xs">
            {index + 1}
          </span>

          <ActionForm
            action={updateStageAction}
            className="grid min-w-0 flex-1 gap-2 sm:grid-cols-[1fr_9.5rem_auto]"
          >
            <input type="hidden" name="stageId" value={stage.id} />
            <Input
              name="name"
              defaultValue={stage.name}
              aria-label="Stage name"
              required
              maxLength={120}
            />
            <Select
              name="status"
              defaultValue={stage.status}
              aria-label="Stage status"
            >
              {STAGE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STAGE_LABEL[s]}
                </option>
              ))}
            </Select>
            <SubmitButton variant="secondary" pendingLabel="Saving…">
              Save
            </SubmitButton>
            <Input
              name="description"
              defaultValue={stage.description}
              aria-label="Stage description"
              placeholder="What happens in this stage (optional)"
              maxLength={1000}
              className="sm:col-span-3"
            />
          </ActionForm>

          <div className="flex shrink-0 flex-col gap-1">
            <ActionForm action={moveStageAction}>
              <input type="hidden" name="stageId" value={stage.id} />
              <input type="hidden" name="direction" value="up" />
              <SubmitButton
                variant="ghost"
                size="sm"
                pendingLabel="…"
                aria-label={`Move ${stage.name} earlier`}
              >
                ↑
              </SubmitButton>
            </ActionForm>
            <ActionForm action={moveStageAction}>
              <input type="hidden" name="stageId" value={stage.id} />
              <input type="hidden" name="direction" value="down" />
              <SubmitButton
                variant="ghost"
                size="sm"
                pendingLabel="…"
                aria-label={`Move ${stage.name} later`}
              >
                ↓
              </SubmitButton>
            </ActionForm>
            <ActionForm
              action={deleteStageAction}
              confirm={`Remove the stage “${stage.name}”?`}
            >
              <input type="hidden" name="stageId" value={stage.id} />
              <SubmitButton
                variant="ghost"
                size="sm"
                pendingLabel="…"
                aria-label={`Remove ${stage.name}`}
              >
                ✕
              </SubmitButton>
            </ActionForm>
          </div>
        </div>
      ))}

      <ActionForm
        action={addStageAction}
        resetOnSuccess
        className="flex flex-wrap items-end gap-2 rounded-lg border border-dashed border-border p-3"
      >
        <input type="hidden" name="projectId" value={projectId} />
        <label className="grid min-w-[12rem] flex-1 gap-1 text-sm">
          <span className="font-medium">Add a stage</span>
          <Input
            name="name"
            required
            maxLength={120}
            placeholder="e.g. Content entry"
          />
        </label>
        <SubmitButton variant="secondary" pendingLabel="Adding…">
          Add stage
        </SubmitButton>
      </ActionForm>
    </div>
  );
}
