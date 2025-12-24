const CACHE_NAME = 'app-v13-network-first'; // ⚠️ قم بتغيير هذا الرقم (v8, v9..) في كل مرة ترفع تحديث
const ASSETS = [
    './',
    './index.html',
    './manifest.json',
    // أضف أي ملفات CSS أو JS خارجية هنا إذا لزم الأمر
];

// 1. التثبيت (Install)
self.addEventListener('install', event => {
    self.skipWaiting(); // يجبر الـ SW الجديد على العمل فوراً
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(ASSETS);
        })
    );
});

// 2. التفعيل (Activate) - تنظيف الكاش القديم
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => Promise.all(
            keys.map(key => {
                if (key !== CACHE_NAME) {
                    return caches.delete(key);
                }
            })
        )).then(() => {
            return self.clients.claim(); // السيطرة على الصفحات المفتوحة فوراً
        })
    );
});

// 3. جلب البيانات (Fetch) - الاستراتيجية الذكية
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // استثناء ملف الإشعارات والملف الرئيسي ليتم جلبهم من الشبكة دائماً (Network First)
    if (url.pathname.endsWith('notifications.json') || 
        url.pathname.endsWith('index.html') || 
        url.pathname.endsWith('/') ||
        event.request.mode === 'navigate') {
        
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    // تحديث الكاش بالنسخة الجديدة
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseClone);
                    });
                    return response;
                })
                .catch(() => {
                    // إذا فشل النت، استخدم الكاش
                    return caches.match(event.request);
                })
        );
        return;
    }

    // باقي الملفات (صور، خطوط) استخدم الكاش أولاً (Cache First)
    event.respondWith(
        caches.match(event.request).then(response => {
            return response || fetch(event.request);
        })
    );
});





