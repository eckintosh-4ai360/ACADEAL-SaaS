type SubscriptionSuspendedPageProps = {
  searchParams?: Promise<{
    school?: string;
    status?: string;
  }>;
};

const STATUS_COPY: Record<string, { heading: string; body: string }> = {
  SUSPENDED: {
    heading: "subscription has expired.",
    body: "Access is paused until the subscription is renewed. Nothing has been deleted — all records, results and payment history are intact and will be available immediately once the account is brought up to date.",
  },
  CLOSED: {
    heading: "account has been closed.",
    body: "This account was closed deliberately. School records are retained and can still be exported. Contact the platform team if this was not expected.",
  },
};

export default async function SubscriptionSuspendedPage({
  searchParams,
}: SubscriptionSuspendedPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const schoolName = resolvedSearchParams?.school?.trim() || "This school";
  const status = resolvedSearchParams?.status?.trim() || "SUSPENDED";
  const copy = STATUS_COPY[status] ?? STATUS_COPY.SUSPENDED;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-16 text-white">
      <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur">
        <p className="text-sm font-semibold uppercase tracking-[0.35em] text-sky-300">
          Renewal Required
        </p>
        <h1 className="mt-4 text-4xl font-black tracking-tight">
          {schoolName}&apos;s {copy.heading}
        </h1>
        <p className="mt-4 text-lg text-slate-200">{copy.body}</p>

        <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
            To restore access
          </h2>
          <p className="mt-3 text-slate-200">
            Contact the platform team to renew. Payment can be made by mobile
            money, bank transfer or cash, and access is restored as soon as the
            payment is recorded.
          </p>
        </div>

        <p className="mt-6 text-sm text-slate-400">
          If you believe this is a mistake, or a payment was made recently that
          has not yet been recorded, please get in touch.
        </p>
      </div>
    </main>
  );
}
