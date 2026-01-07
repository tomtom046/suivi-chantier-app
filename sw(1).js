// MODIFIÉ: Nom du cache incrémenté à 'v10' pour forcer la mise à jour
const CACHE_NAME = 'suivi-chantier-cache-v10';

// Fichiers de la "coquille" (App Shell) à mettre en cache
const URLS_TO_CACHE = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './apple-icon-180.png',
  
  // Styles et Polices
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css',
  // AJOUT: La police Google Fonts pour qu'elle marche hors ligne
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap',

  // Bibliothèques PDF (CRITIQUE: ajout de autotable)
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js',

  // Firebase SDK (Version 11.6.1)
  'https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js',
  'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js',
  'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js'
];

// 1. Installation
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installation (v10)...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Mise en cache des fichiers');
        // Cache: 'reload' force le téléchargement réseau, ignorant le cache navigateur temporaire
        const requests = URLS_TO_CACHE.map(url => new Request(url, { cache: 'reload' }));
        return cache.addAll(requests);
      })
      .then(() => self.skipWaiting())
  );
});

// 2. Activation (Nettoyage des vieux caches)
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activation (v10)...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Suppression ancien cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Interception des requêtes (Stratégie: Cache First, falling back to Network)
self.addEventListener('fetch', (event) => {
  // Ignorer les méthodes non-GET (POST, DELETE, etc.)
  if (event.request.method !== 'GET') return;
  
  // Ignorer Firestore (géré par le SDK Firebase lui-même)
  if (event.request.url.includes('firestore.googleapis.com') || 
      event.request.url.includes('google.firestore')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // 1. Trouvé dans le cache ? On le retourne.
        if (response) {
          return response;
        }
        
        // 2. Sinon, on cherche sur le réseau
        const fetchRequest = event.request.clone();
        return fetch(fetchRequest)
          .then((networkResponse) => {
            // Vérification de validité
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic' && networkResponse.type !== 'cors') {
              return networkResponse;
            }

            // 3. On met en cache la nouvelle ressource pour le futur
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return networkResponse;
          });
      })
      .catch(() => {
        // Optionnel : Retourner une page offline.html si le réseau échoue pour une page
        // if (event.request.mode === 'navigate') { ... }
      })
  );
});