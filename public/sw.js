// sw.js — só pra notificações (não guarda nada em cache: dados sempre ao vivo)
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data.json(); } catch (_) { d = { title: 'Radar', body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.title || 'Radar', {
    body: d.body || '', icon: '/icon-192.png', badge: '/icon-192.png', data: { url: d.url || '/' }
  }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || '/';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) { if ('focus' in c) { c.navigate(url); return c.focus(); } }
    return self.clients.openWindow(url);
  }));
});
