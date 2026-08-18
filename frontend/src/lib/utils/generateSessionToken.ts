export function extractSessionToken(receipt: any): string {
  const readable =
    receipt?.consensus_data?.leader_receipt?.[0]?.result?.payload?.readable ??
    receipt?.leader_receipt?.[0]?.result?.payload?.readable ??
    "";

  let raw = String(readable).trim();
  if (raw.startsWith("\"") && raw.endsWith("\"")) {
    raw = raw.slice(1, -1);
  }
  try {
    const parsed = JSON.parse(readable);
    if (typeof parsed === "string") raw = parsed;
  } catch {
  }
  if (raw.includes(":")) {
    return raw.split(":").pop()!.trim();
  }
  return raw.trim();
}