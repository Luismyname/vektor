import { useMemo, useRef, useEffect } from 'react'
import { getNextStartTime } from '../services/getNextStartTime'

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 }

function compareUnscheduledItems(left, right, itemType) {
  if (itemType === 'task') {
    const priorityDifference = (PRIORITY_ORDER[left.priority] ?? 1) - (PRIORITY_ORDER[right.priority] ?? 1)
    if (priorityDifference) return priorityDifference
  }

  return String(left.created_at || '').localeCompare(String(right.created_at || ''))
}

function getEntryTimestamp(entry) {
  return `${entry.date || ''}T${entry.start_time || ''}`
}

export function useSortedByNextStartTime(items, entries, itemType, now) {
  // Use a ref to store the current time, initialized lazily
  const nowRef = useRef(() => {
    // Lazy initializer - only called once
    return now ?? Date.now()
  })

  // Update ref when `now` prop changes
  useEffect(() => {
    if (now !== undefined) {
      nowRef.current = now
    }
  }, [now])

  return useMemo(() => {
    return items
      .map((item) => ({
        ...item,
        nextStart: getNextStartTime(item, entries, itemType, now),
      }))
      .sort((left, right) => {
        if (left.nextStart && right.nextStart) {
          return getEntryTimestamp(left.nextStart).localeCompare(getEntryTimestamp(right.nextStart))
        }
        if (left.nextStart) return -1
        if (right.nextStart) return 1
        return compareUnscheduledItems(left, right, itemType)
      })
  }, [items, entries, itemType, now])
}