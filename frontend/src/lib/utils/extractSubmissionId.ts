export function extractSubmissionId(receipt: any): string {
  const readable =
    receipt?.consensus_data?.leader_receipt?.[0]?.result?.payload?.readable ?? "";

  let raw = String(readable).trim();
  try {
    const parsed = JSON.parse(readable);
    if (typeof parsed === "string") raw = parsed;
  } catch {}
  if (raw.startsWith('"') && raw.endsWith('"')) raw = raw.slice(1, -1);
  return raw.trim(); // "sub_1"
}