export async function fetchMeetingsByStatus(status) {
  const res = await fetch(`http://localhost:5000/api/meetings?status=${encodeURIComponent(status)}`);
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}
