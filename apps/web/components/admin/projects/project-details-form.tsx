import type { Project } from '@softmato/db';

import { updateProjectAction } from '@/app/(admin)/admin/projects/actions/update-project';
import { ActionForm } from '@/components/admin/clients/action-form';
import { SubmitButton } from '@/components/admin/submit-button';
import { Field } from '@/components/ui/field';
import { Input, Textarea } from '@/components/ui/input';
import { PROJECT_LABEL, PROJECT_STATUSES } from '@/lib/projects/labels';
import { PREVIEW_DOMAIN, suggestSlug } from '@/lib/projects/preview';

import { Select } from './select';

export function ProjectDetailsForm({ project }: { project: Project }) {
  return (
    <ActionForm action={updateProjectAction} className="grid gap-4">
      <input type="hidden" name="projectId" value={project.id} />
      <div className="grid gap-4 sm:grid-cols-[1fr_12rem]">
        <Field id="p-name" label="Name">
          {(props) => (
            <Input
              {...props}
              name="name"
              defaultValue={project.name}
              required
              maxLength={200}
            />
          )}
        </Field>
        <Field id="p-status" label="Status">
          {(props) => (
            <Select {...props} name="status" defaultValue={project.status}>
              {PROJECT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {PROJECT_LABEL[s]}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>
      <Field
        id="p-summary"
        label="Summary"
        help="Shown to the client under the project name."
      >
        {(props) => (
          <Textarea
            {...props}
            name="summary"
            rows={3}
            defaultValue={project.summary}
            maxLength={4000}
          />
        )}
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="p-start" label="Starts">
          {(props) => (
            <Input
              {...props}
              name="startsOn"
              type="date"
              defaultValue={project.startsOn ?? ''}
            />
          )}
        </Field>
        <Field id="p-due" label="Due">
          {(props) => (
            <Input
              {...props}
              name="dueOn"
              type="date"
              defaultValue={project.dueOn ?? ''}
            />
          )}
        </Field>
      </div>
      <Field
        id="p-preview"
        label="Preview address"
        help="The site in progress, shown to the client in a browser frame on their project page. Previews Softmato builds live in app/(previews)/preview/<name>. Leave blank until there is something to see."
      >
        {(props) => (
          <div className="flex items-center rounded-lg border border-input bg-background focus-within:ring-[3px] focus-within:ring-ring/50">
            <span className="pl-3 text-sm text-muted-foreground">https://</span>
            <input
              {...props}
              name="previewSlug"
              defaultValue={project.previewSlug ?? ''}
              placeholder={suggestSlug(project.name)}
              maxLength={63}
              pattern="[a-z0-9]([a-z0-9\-]{0,61}[a-z0-9])?"
              autoComplete="off"
              spellCheck={false}
              className="h-10 min-w-0 flex-1 bg-transparent px-1 font-mono text-sm focus:outline-none"
            />
            <span className="pr-3 text-sm text-muted-foreground">
              .{PREVIEW_DOMAIN}
            </span>
          </div>
        )}
      </Field>
      <div>
        <SubmitButton pendingLabel="Saving…">Save details</SubmitButton>
      </div>
    </ActionForm>
  );
}
