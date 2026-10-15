/* ============================================================================
   pwa.js · Instalación como app
   ----------------------------------------------------------------------------
   Hace dos cosas, y nada más (no toca js/app.js ni la lógica del cancionero):
     1. Registra el service worker (sw.js) para que la app abra sin conexión.
     2. Muestra el enlace "Instalar app" del pie solo cuando se puede instalar:
          · Chrome / Edge / Android → abre el cuadro de instalación del navegador.
          · iPhone / iPad (Safari)  → no existe ese cuadro; se muestra cómo hacerlo.
        Si la app ya está instalada y abierta como app, el enlace no aparece.
   ============================================================================ */
(function () {
  'use strict';

  /* --- 1 · Service worker ------------------------------------------------- */
  /* Solo funciona en https:// (GitHub Pages lo es) o en localhost. Con doble
     clic sobre index.html (file://) el navegador no lo permite y se omite. */
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () { /* sin PWA, la web sigue igual */ });
    });
  }

  /* --- 2 · Enlace "Instalar app" ------------------------------------------ */
  var yaInstalada =
    (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
    window.navigator.standalone === true;
  if (yaInstalada) { return; }

  function iniciar() {
    var boton = document.getElementById('btn-instalar');
    var ayuda = document.getElementById('instalar-ayuda');
    if (!boton) { return; }

    var evento = null; // el aviso de instalación que guarda Chrome/Edge

    window.addEventListener('beforeinstallprompt', function (ev) {
      ev.preventDefault();      // se pospone para mostrarlo al tocar el enlace
      evento = ev;
      boton.hidden = false;
    });

    window.addEventListener('appinstalled', function () {
      evento = null;
      boton.hidden = true;
      if (ayuda) { ayuda.hidden = true; }
    });

    /* iPhone / iPad: Safari no avisa nada; hay que guiar a la persona. */
    var esIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) ||
                (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if (esIOS) { boton.hidden = false; }

    boton.addEventListener('click', function () {
      if (evento) {
        evento.prompt();
        evento.userChoice.then(function () {
          evento = null;         // el aviso solo se puede usar una vez
          boton.hidden = true;
        });
      } else if (ayuda) {
        ayuda.hidden = !ayuda.hidden;
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }
})();
