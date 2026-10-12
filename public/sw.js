// Service Worker para Vektor - Notificaciones push y cache offline
/* eslint-disable no-undef */
const CACHE_NAME = 'vektor-v1'
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/vite.svg',
]

// Install - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS)
    })
  )
  self.skipWaiting()
})

// Activate - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    })
  )
  self.clients.claim()
})

// Fetch - network first, fallback to cache
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return

  // Skip external requests
  const url = new URL(event.request.url)
  if (url.origin !== location.origin) return

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful responses
        if (response.ok) {
          const responseClone = response.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone)
          })
        }
        return response
      })
      .catch(() => {
        // Fallback to cache
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse
          // Offline fallback for navigation
          if (event.request.mode === 'navigate') {
            return caches.match('/')
          }
          // Return a basic offline response for other requests
          return new Response('Offline', { status: 503, statusText: 'Service Unavailable' })
        })
      })
  )
})

// Push notifications
self.addEventListener('push', (event) => {
  if (!event.data) return

  const data = event.data.json()
  const options = {
    body: data.body || '',
    icon: data.icon || '/vite.svg',
    badge: data.badge || '/vite.svg',
    tag: data.tag || 'vektor-push',
    renotify: true,
    requireInteraction: data.requireInteraction || false,
    data: data.data || {},
    actions: data.actions || [],
  }

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  )
})

// Notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const action = event.action
  const data = event.notification.data || {}

  let targetUrl = '/'

  switch (data.type) {
    case 'energy_checkin':
      targetUrl = '/?tab=energy'
      break
    case 'deep_work_start':
      targetUrl = '/?tab=planner'
      break
    case 'habit_reminder':
      targetUrl = '/?tab=planner'
      break
    case 'weekly_review':
      targetUrl = '/?tab=review'
      break
    case 'focus_session_end':
      targetUrl = '/?tab=focus'
      break
    default:
      targetUrl = '/'
  }

  // Handle actions
  if (action === 'start' && data.blockId) {
    targetUrl = `/?tab=planner&focus=${data.blockId}`
  } else if (action === 'complete' && data.habitId) {
    targetUrl = `/?tab=planner&habit=${data.habitId}`
  } else if (action === 'rate' && data.sessionId) {
    targetUrl = `/?tab=focus&rate=${data.sessionId}`
  } else if (action === 'snooze') {
    // Re-schedule notification for 10 minutes later
    scheduleSnoozeNotification(data, 10)
    return
  } else if (action === 'skip') {
    return
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus existing window if open
      for (const client of clientList) {
        if (client.url.includes(location.origin) && 'focus' in client) {
          return client.focus()
        }
      }
      // Open new window
      return clients.openWindow(targetUrl)
    })
  )
})

// Notification close
self.addEventListener('notificationclose', (event) => {
  // Track dismissal if needed
  console.log('Notification closed:', event.notification.tag)
})

// Message from main thread
self.addEventListener('message', (event) => {
  const { type, title, options } = event.data

  if (type === 'SHOW_NOTIFICATION') {
    self.registration.showNotification(title, options)
  }

  if (type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

// Schedule snooze notification
function scheduleSnoozeNotification(originalData, minutes) {
  setTimeout(() => {
    self.registration.showNotification(originalData.title, {
      body: originalData.body,
      icon: originalData.icon,
      tag: originalData.tag + '-snooze',
      data: originalData.data,
      actions: originalData.actions,
    })
  }, minutes * 60 * 1000)
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-energy-checkin') {
    event.waitUntil(syncEnergyCheckins())
  }
  if (event.tag === 'sync-focus-sessions') {
    event.waitUntil(syncFocusSessions())
  }
})

async function syncEnergyCheckins() {
  // Implementation for syncing offline energy check-ins
  console.log('Syncing energy check-ins...')
}

async function syncFocusSessions() {
  // Implementation for syncing offline focus sessions
  console.log('Syncing focus sessions...')
}