const ACTIVE_PLANNER_STATUSES = new Set(['scheduled', 'moved'])

export function getNextStartTime(item, entries, itemType, now = new Date()) {
  const itemId = itemType === 'task' ? item.id : (item.id || item.title)
  const matchingEntries = entries
    .filter((entry) => (
      entry[`${itemType}_id`] === itemId
      && ACTIVE_PLANNER_STATUSES.has(entry.status)
    ))
    .slice()
    .sort((left, right) => (
      `${left.date}T${left.start_time}`.localeCompare(`${right.date}T${right.start_time}`)
    ))

  const nextEntry = matchingEntries.find((entry) => (
    new Date(`${entry.date}T${entry.start_time}`) >= now
  )) || matchingEntries[matchingEntries.length - 1]

  return nextEntry || null
}
