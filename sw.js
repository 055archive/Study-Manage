const CACHE_NAME = 'studymanage-v8.4';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Hanya tangani request GET http/https
  if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) return;
  
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

// ============================================================================
// BACKGROUND WEB PUSH NOTIFICATIONS (Membangunkan Layar HP saat Browser Tutup)
// ============================================================================
self.addEventListener('push', (event) => {
  let payload = {
    title: 'Tugas Baru Kelas! 📢',
    body: 'Ada pengumuman tugas atau materi baru yang dipublikasikan pengurus kelas.',
    url: '/'
  };

  try {
    if (event.data) {
      payload = event.data.json();
    }
  } catch (err) {
    if (event.data) {
      payload.body = event.data.text();
    }
  }

  const options = {
    body: payload.body || 'Periksa tugas dan materi terbaru di StudySync!',
    icon: 'icons/icon-192.png',
    badge: 'icons/icon-192.png',
    vibrate: [200, 100, 200, 100, 200],
    tag: payload.tag || 'studysync-push-' + Date.now(),
    renotify: true,
    requireInteraction: true,
    data: {
      url: payload.url || '/'
    }
  };

  event.waitUntil(
    self.registration.showNotification(payload.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) ? event.notification.data.url : '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
