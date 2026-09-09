'use client';

import type { ProductKind } from '@softmato/db';

import { NEW_PRODUCT } from '@/lib/applications/constants';
import { FieldError } from '@/components/admin/field-error';

/**
 * Which product an application bills to — including one that does not exist
 * yet.
 *
 * ## Why creating one lives here
 *
 * The list used to be whatever `pnpm db:seed` inserted, and there was no
 * screen anywhere that could add to it. So registering an application for a
 * product built after the seed was written was simply not possible: the form
 * offered four options and none of them were right, and the only way through
 * was an `INSERT` by hand in psql.
 *
 * A product is a ledger dimension, so the obvious home for creating one is
 * `/admin/products`. It is not the *useful* home. The moment an admin
 * discovers the list is missing their product is the moment they are halfway
 * through this form, and sending them to another screen means coming back to
 * an empty one. The row is created in the same transaction as the application
 * (`registerApplication`), so the trip is not just saved — it is atomic, and
 * a failed registration cannot leave an orphan product behind.
 *
 * ## Why the ledger dimensions are still listed
 *
 * `agency` and `corporate` exist so every rupee has somewhere to post, and
 * they are not what an API integration is normally for. They are grouped apart
 * rather than hidden, because the client portal bills against `agency` — a
 * list that quietly dropped it would take away a registration somebody
 * legitimately needs, which is the same failure as the seeded list, just
 * better disguised.
 */
const KIND_LABEL: Record<ProductKind, string> = {
  saas: 'SaaS product',
  agency: 'Agency / project work',
  corporate: 'Shared overhead',
};

export interface ProductOption {
  id: string;
  name: string;
  kind: ProductKind;
}

/** What the admin is typing into the create fields. */
export interface NewProductDraft {
  id: string;
  name: string;
  kind: ProductKind;
}

export function ProductField({
  products,
  productId,
  onProductChange,
  draft,
  onDraftChange,
  errors,
}: {
  products: ProductOption[];
  productId: string;
  onProductChange: (id: string) => void;
  draft: NewProductDraft;
  onDraftChange: (draft: NewProductDraft) => void;
  errors?: Record<string, string> | undefined;
}) {
  const creating = productId === NEW_PRODUCT;
  const saas = products.filter((product) => product.kind === 'saas');
  const ledger = products.filter((product) => product.kind !== 'saas');

  return (
    <>
      <label className="block text-sm font-medium" htmlFor="app-product">
        Product
      </label>

      <select
        id="app-product"
        name="productId"
        required
        value={productId}
        onChange={(event) => onProductChange(event.target.value)}
        className="mt-1 w-full rounded-md border border-input px-3 py-2 text-sm"
      >
        {saas.length > 0 ? (
          <optgroup label="Products">
            {saas.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </optgroup>
        ) : null}

        {ledger.length > 0 ? (
          <optgroup label="Ledger dimensions">
            {ledger.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </optgroup>
        ) : null}

        <optgroup label="Not listed">
          <option value={NEW_PRODUCT}>New product…</option>
        </optgroup>
      </select>

      <FieldError message={errors?.['productId']} />

      {creating ? (
        <fieldset className="mt-3 rounded-md border border-border p-4">
          <legend className="px-1 text-xs font-medium">New product</legend>

          <p className="text-xs text-muted-foreground">
            Created together with this application — if the registration is
            refused, the product is not left behind.
          </p>

          <label
            className="mt-4 block text-sm font-medium"
            htmlFor="new-product-id"
          >
            Id
          </label>
          <input
            id="new-product-id"
            name="newProductId"
            value={draft.id}
            onChange={(event) =>
              onDraftChange({ ...draft, id: event.target.value })
            }
            placeholder="question-call"
            aria-describedby="new-product-id-help"
            className="mt-1 w-full rounded-md border border-input px-3 py-2 font-mono text-sm"
          />
          <p
            id="new-product-id-help"
            className="mt-1 text-xs text-muted-foreground"
          >
            Lowercase letters, digits and single hyphens.{' '}
            <strong>Permanent:</strong> it is minted into every client id this
            product issues (
            <code className="font-mono">
              app_test_{draft.id || 'your-id'}_…
            </code>
            ), and renaming it later would orphan them.
          </p>
          <FieldError message={errors?.['newProductId']} />

          <label
            className="mt-4 block text-sm font-medium"
            htmlFor="new-product-name"
          >
            Name
          </label>
          <input
            id="new-product-name"
            name="newProductName"
            value={draft.name}
            onChange={(event) =>
              onDraftChange({ ...draft, name: event.target.value })
            }
            placeholder="QuestionCall"
            className="mt-1 w-full rounded-md border border-input px-3 py-2 text-sm"
          />
          <FieldError message={errors?.['newProductName']} />

          <label
            className="mt-4 block text-sm font-medium"
            htmlFor="new-product-kind"
          >
            Kind
          </label>
          <select
            id="new-product-kind"
            name="newProductKind"
            value={draft.kind}
            onChange={(event) =>
              onDraftChange({
                ...draft,
                kind: event.target.value as ProductKind,
              })
            }
            aria-describedby="new-product-kind-help"
            className="mt-1 w-full rounded-md border border-input px-3 py-2 text-sm"
          >
            {(Object.keys(KIND_LABEL) as ProductKind[]).map((kind) => (
              <option key={kind} value={kind}>
                {KIND_LABEL[kind]}
              </option>
            ))}
          </select>
          <p
            id="new-product-kind-help"
            className="mt-1 text-xs text-muted-foreground"
          >
            How the ledger slices this product&rsquo;s revenue and costs.
          </p>
          <FieldError message={errors?.['newProductKind']} />
        </fieldset>
      ) : null}
    </>
  );
}
