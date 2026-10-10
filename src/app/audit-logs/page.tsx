import { redirect } from "next/navigation";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function AuditLogsAliasPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const urlParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        urlParams.append(key, item);
      }
      continue;
    }

    if (typeof value === "string") {
      urlParams.set(key, value);
    }
  }

  const destination = urlParams.size
    ? `/dashboard/logs?${urlParams.toString()}`
    : "/dashboard/logs";

  redirect(destination);
}
