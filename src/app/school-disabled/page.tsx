type SchoolDisabledPageProps = {
  searchParams?: Promise<{
    school?: string;
  }>;
};

export default async function SchoolDisabledPage({
  searchParams,
}: SchoolDisabledPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const schoolName = resolvedSearchParams?.school?.trim() || "This school";

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-16 text-white">
      <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur">
        <p className="text-sm font-semibold uppercase tracking-[0.35em] text-amber-300">
          Access Disabled
        </p>
        <h1 className="mt-4 text-4xl font-black tracking-tight">
          {schoolName}&apos;s portal is currently unavailable.
        </h1>
        <p className="mt-4 text-lg text-slate-200">
          This school has been disabled by the platform administrator, so its
          login pages, dashboard, and API access are temporarily blocked.
        </p>
        <p className="mt-4 text-sm text-slate-400">
          If you believe this is a mistake, please contact your school or the
          platform support team.
        </p>
      </div>
    </main>
  );
}
