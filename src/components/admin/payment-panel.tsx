"use client";

import { Loader2 } from "lucide-react";
import { type FormEvent, useEffect, useState, useTransition } from "react";

import { adminFieldClass, Field } from "@/components/admin/form-field";
import { Button } from "@/components/ui/button";
import {
  type PaymentActionResult,
  recordDeposit,
  sendPaymentRequest,
} from "@/server/actions/admin/booking-payments";

type Props = {
  reference: string;
  /** Requested deposit in dollars, e.g. "305.10". */
  depositAmount: string;
  paymentLinkUrl: string;
  alreadyRequested: boolean;
  today: string;
};

type State = { errors: Record<string, string>; message: string | null; failed: boolean };
const idle: State = { errors: {}, message: null, failed: false };

function useAction(success: string) {
  const [state, setState] = useState<State>(idle);
  const [pending, startTransition] = useTransition();
  const run = (action: () => Promise<PaymentActionResult>) => {
    setState(idle);
    startTransition(async () => {
      const result = await action();
      if (result.ok) setState({ ...idle, message: success });
      else if ("fieldErrors" in result) setState({ ...idle, errors: result.fieldErrors });
      else
        setState({
          ...idle,
          failed: true,
          message:
            result.error === "server" ? "Something went wrong. Please try again." : result.error,
        });
    });
  };
  return { state, pending, run };
}

function Feedback({ state }: { state: State }) {
  if (!state.message) return null;
  return state.failed ? (
    <p role="alert" className="text-destructive text-sm">
      {state.message}
    </p>
  ) : (
    <p role="status" className="text-sm text-emerald-800 dark:text-emerald-300">
      {state.message}
    </p>
  );
}

/** Send the payment request and record the deposit (AGENTS.md §6.6). */
export function PaymentPanel({
  reference,
  depositAmount,
  paymentLinkUrl,
  alreadyRequested,
  today,
}: Props) {
  const request = useAction("Payment request sent to the client.");
  const deposit = useAction(
    "Deposit recorded — the booking is confirmed and the client was emailed.",
  );
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  const onRequest = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const input = Object.fromEntries(new FormData(event.currentTarget));
    request.run(() => sendPaymentRequest(reference, input));
  };
  const onDeposit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const input = Object.fromEntries(new FormData(event.currentTarget));
    deposit.run(() => recordDeposit(reference, input));
  };
  const a11y = (prefix: string, errors: Record<string, string>, name: string) => ({
    id: `${prefix}${name}`,
    name,
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": errors[name] ? `${prefix}${name}-error` : undefined,
  });

  return (
    <div className="grid gap-6 lg:grid-cols-2" data-hydrated={hydrated}>
      <form
        onSubmit={onRequest}
        noValidate
        aria-labelledby="request-title"
        className="bg-card space-y-4 rounded-xl border p-5"
      >
        <h2 id="request-title" className="text-lg font-medium">
          {alreadyRequested ? "Send the payment request again" : "Send payment request"}
        </h2>
        <p className="text-muted-foreground text-sm">
          Emails the deposit amount and your payment instructions (Settings) in the client&apos;s
          language.
          {alreadyRequested && " Sending again restarts the unpaid hold."}
        </p>
        <Field
          name="paymentLinkUrl"
          idPrefix="request-"
          label="Payment link (optional)"
          hint="A full https:// link, e.g. from your bank or payment provider."
          error={request.state.errors.paymentLinkUrl}
        >
          <input
            {...a11y("request-", request.state.errors, "paymentLinkUrl")}
            type="url"
            defaultValue={paymentLinkUrl}
            className={adminFieldClass}
          />
        </Field>
        <Button type="submit" disabled={request.pending}>
          {request.pending && <Loader2 className="animate-spin" aria-hidden />}
          {request.pending ? "Sending…" : "Send payment request"}
        </Button>
        <Feedback state={request.state} />
      </form>

      <form
        onSubmit={onDeposit}
        noValidate
        aria-labelledby="deposit-title"
        className="bg-card space-y-4 rounded-xl border p-5"
      >
        <h2 id="deposit-title" className="text-lg font-medium">
          Record deposit
        </h2>
        <p className="text-muted-foreground text-sm">Confirms the booking and emails the client.</p>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field
            name="method"
            idPrefix="deposit-"
            label="Paid by"
            error={deposit.state.errors.method}
          >
            <select
              {...a11y("deposit-", deposit.state.errors, "method")}
              defaultValue=""
              className={adminFieldClass}
            >
              <option value="">Choose…</option>
              <option value="BANK_TRANSFER">Bank transfer</option>
              <option value="CASH">Cash</option>
              <option value="PAYMENT_LINK">Payment link</option>
            </select>
          </Field>
          <Field
            name="amount"
            idPrefix="deposit-"
            label="Amount (CAD)"
            error={deposit.state.errors.amount}
          >
            <input
              {...a11y("deposit-", deposit.state.errors, "amount")}
              inputMode="decimal"
              defaultValue={depositAmount}
              className={adminFieldClass}
            />
          </Field>
          <Field
            name="paidOn"
            idPrefix="deposit-"
            label="Received on"
            error={deposit.state.errors.paidOn}
          >
            <input
              {...a11y("deposit-", deposit.state.errors, "paidOn")}
              type="date"
              max={today}
              defaultValue={today}
              className={adminFieldClass}
            />
          </Field>
        </div>
        <Button type="submit" disabled={deposit.pending}>
          {deposit.pending && <Loader2 className="animate-spin" aria-hidden />}
          {deposit.pending ? "Saving…" : "Record deposit and confirm"}
        </Button>
        <Feedback state={deposit.state} />
      </form>
    </div>
  );
}
