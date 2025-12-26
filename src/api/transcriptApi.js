export async function fetchTranscript(eventId) {
    const res = await fetch(`http://localhost:5000/api/meetings/${eventId}/transcript`);
    if (!res.ok) throw new Error(await res.text());
    return await res.text(); // VTT text
}
