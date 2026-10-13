// Reorder only the slots already belonging to an organizer.
export function prioritizeOrganizerEvents(rows) {
  const groups = new Map();
  rows.forEach((event, index) => {
    if (!event.organizerId) return;
    const group = groups.get(event.organizerId) || [];
    group.push(index);
    groups.set(event.organizerId, group);
  });
  const result = [...rows];
  for (const indices of groups.values()) {
    const preferred = indices.find(index => rows[index].organizer?.preferredEventId === rows[index].id);
    if (preferred === undefined) continue;
    const ordered = [rows[preferred], ...indices.filter(index => index !== preferred).map(index => rows[index])];
    indices.forEach((index, position) => { result[index] = ordered[position]; });
  }
  return result;
}
