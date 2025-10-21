// Service Worker for LNMS PWA
const CACHE_NAME = 'lnms-v1.0.0';
const urlsToCache = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/main.js',
  '/js/firebase-init.js',
  '/js/auth.js',
  '/js/admin-auth.js',
  '/js/teacher-dashboard.js',
  '/js/create-lesson.js',
  '/js/admin-dashboard.js',
  '/js/review-lessons.js',
  '/js/manage-teachers.js',
  '/pages/login.html',
  '/pages/register.html',
  '/pages/admin-login.html',
  '/pages/teacher-dashboard.html',
  '/pages/create-lesson.html',
  '/pages/admin-dashboard.html',
  '/pages/review-lessons.html',
  '/pages/manage-teachers.html',
  '/manifest.json'
];

// Install Service Worker
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching files');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate Service Worker
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('Service Worker: Clearing old cache');
            return caches.delete(cache);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Fetch Event - Network First, then Cache
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clone the response
        const responseClone = response.clone();
        
        // Cache the fetched response
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });
        
        return response;
      })
      .catch(() => {
        // If network fails, try cache
        return caches.match(event.request).then((response) => {
          if (response) {
            return response;
          }
          
          // If not in cache, return offline page
          if (event.request.destination === 'document') {
            return caches.match('/index.html');
          }
        });
      })
  );
});

// Background Sync
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-lessons') {
    event.waitUntil(syncLessons());
  }
});

// Push Notifications
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'LNMS Notification';
  const options = {
    body: data.body || 'You have a new notification',
    icon: '/assets/icon-192x192.png',
    badge: '/assets/icon-72x72.png',
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/'
    }
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification Click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});

// Helper function for syncing lessons
async function syncLessons() {
  console.log('Syncing lessons...');
  // Implement lesson sync logic here
}