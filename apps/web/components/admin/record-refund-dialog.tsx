'use client';

import { useRef } from 'react';
import { useFormStatus } from 'react-dom';

import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';

import { recordRefundAction } from '@/app/(admin)/admin/refunds/actions';

/**
 * "Record refund" for one requested refund: the admin has already sent the
 * money from the provider's merchant app and types what happened there. The
 * server books it and emails the customer.
 *
 * Native `<dialog>` + `showModal()`, like `ConfirmDialog`: focus trap,
 * backdrop and Escape come free.
 */
export function RecordRefundDialog({
  refundNo,
  txnNo,
  providerName,
  amount,
}: {
  refundNo: string;
  txnNo: string;
  providerName: string;
  /** Rupees, pre-filled from the request, e.g. "12.00". */
  amount: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = `refund-${refundNo}-title`;

  return (
    <>
      <Button size="sm" onClick={() => ref.current?.showModal()}>
        Record refund
      </Button>

      <dialog
        ref={ref}
        aria-labelledby={titleId}
        onClick={(event) => {
          if (event.target === ref.current) ref.current?.close();
        }}
        className="m-auto w-[min(30rem,calc(100vw-2rem))] rounded-xl border border-border bg-card p-0 text-left text-foreground shadow-float backdrop:bg-black/40 open:animate-rise"
      >
        <form action={recordRefundAction} className="space-y-3 px-5 py-4">
          <div>
            <h2 id={titleId} className="headline text-[17px]">
              Record refund {refundNo}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Send the money from the {providerName} merchant app first, then
              record it here. This books it against {txnNo} and emails the
              customer.
            </p>
          </div>

          <input name="refundNo" type="hidden" value={refundNo} />

          <Label text="Amount refunded (NPR)">
            <Input
              name="amount"
              defaultValue={amount}
              inputMode="decimal"
              pattern="\d+(\.\d{1,2})?"
              required
            />
          </Label>
          <Label text={`${providerName} refund reference`}>
            <Input name="reference" maxLength={100} required />
          </Label>
          <Label text="Message to the customer (optional)">
            <Textarea name="message" rows={3} maxLength={1000} />
          </Label>

          <div className="grid grid-cols-2 gap-2">
            <Label text="Password">
              <Input
                name="password"
                type="password"
                autoComplete="current-password"
                required
              />
            </Label>
            <Label text="Authenticator code">
              <Input
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
              />
            </Label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => ref.current?.close()}>
              Cancel
            </Button>
            <Submit />
          </div>
        </form>
      </dialog>
    </>
  );
}

function Label({
  text,
  children,
}: {
  text: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1 text-xs font-medium text-muted-foreground">
      <span>{text}</span>
      {children}
    </label>
  );
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Recording…' : 'Record and email'}
    </Button>
  );
}
