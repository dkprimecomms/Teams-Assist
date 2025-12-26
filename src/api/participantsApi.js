export async function fetchInvitees(eventId) {
  const res = await fetch(`http://localhost:5000/api/meetings/${eventId}/invitees`);
  if (!res.ok) throw new Error(await res.text());
  return await res.json(); // [{name,email,role,response}]
}
