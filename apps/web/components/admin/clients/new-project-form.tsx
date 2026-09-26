import { createProjectAction } from '@/app/(admin)/admin/clients/actions/create-project';
import { SubmitButton } from '@/components/admin/submit-button';
import { Field } from '@/components/ui/field';
import { Input, Textarea } from '@/components/ui/input';

import { ActionForm } from './action-form';

export function NewProjectForm({ clientId }: { clientId: number }) {
  return (
    <ActionForm action={createProjectAction} className="grid gap-4">
      <input type="hidden" name="clientId" value={clientId} />
      <Field id="project-name" label="Project name" required>
        {(props) => <Input {...props} name="name" required maxLength={200} />}
      </Field>
      <Field
        id="project-summary"
        label="Summary"
        help="One or two sentences the client will recognise."
      >
        {(props) => (
          <Textarea {...props} name="summary" rows={2} maxLength={4000} />
        )}
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="project-start" label="Starts">
          {(props) => <Input {...props} name="startsOn" type="date" />}
        </Field>
        <Field id="project-due" label="Due">
          {(props) => <Input {...props} name="dueOn" type="date" />}
        </Field>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="standardStages"
          defaultChecked
          className="size-4 accent-[var(--primary)]"
        />
        Start with the usual stages: Discovery, Design, Build, Testing, Launch
      </label>
      <div>
        <SubmitButton pendingLabel="Creating…">Create project</SubmitButton>
      </div>
    </ActionForm>
  );
}
