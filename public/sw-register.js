/*
 * Service worker sirf webapp pages (/w/...) pe register hota hai.
 * External file isliye hai taaki CSP ka `script-src 'self'` bina nonce ke pass ho jaye.
 */
(function () {
    if (!('serviceWorker' in navigator)) return;
    if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') return;

    window.addEventListener('load', function () {
        navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(function () {
            // register na ho paye to bhi page normal website ki tarah chalta rahe
        });
    });
})();
