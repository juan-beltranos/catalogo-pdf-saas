import { App } from "../App";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const tokenParam = (await searchParams).token;
  const registrationToken = (Array.isArray(tokenParam) ? tokenParam[0] : tokenParam)?.trim() || "";

  return <App registrationToken={registrationToken} />;
}
