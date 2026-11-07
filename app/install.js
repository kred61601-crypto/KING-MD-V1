/* "Install the app" card on Home. Only on the app's own address (app.<site>), only in a browser tab (never inside the installed app),
   closed = hidden for 7 days. The site's Install button opens this address with ?install=1, which shows the card even if it was closed. */
(function () {
  'use strict';
  var EH = window.EH; if (!EH) return;
  var dp = null, host = '', ios = /iphone|ipad|ipod/i.test(navigator.userAgent), DAY = 864e5;

  function standalone() { try { return (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true; } catch (e) { return false; } }
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); dp = e; EH.emit('install'); });
  window.addEventListener('appinstalled', function () { dp = null; EH.ss.del('eh_inst_force'); EH.ls.set('eh_inst_dis', String(Date.now())); EH.emit('install'); EH.toast('App installed 🎉', 'ok'); });
  EH.on('status', function (d) { var h = (d && d.app && d.app.host) || ''; if (h !== host) { host = h; EH.emit('install'); } });

  function wanted() {
    if (!host || location.hostname !== host || standalone()) return false;
    if (EH.ss.get('eh_inst_force')) return true;
    var last = +EH.ls.get('eh_inst_dis') || 0; return !(last && Date.now() - last < 7 * DAY);
  }
  EH.installCard = function () {
    if (!wanted()) return '';
    var sub = dp ? 'Opens full screen from your home screen, with notifications.' : ios ? 'Tap Share, then Add to Home Screen.' : 'Add it to your home screen from the browser menu.';
    return '<section class="inst rise" style="--i:2"><img src="/logo.png" alt=""><div class="inst-t"><b>Install the app</b><small>' + EH.esc(sub) + '</small></div>' +
      '<button class="inst-go tap" data-inst-go>' + (ios ? 'How' : 'Install') + '</button><button class="inst-x tap" data-inst-x aria-label="Close">' + EH.ic('x') + '</button></section>';
  };
  EH.install = function () {
    if (dp) { var p = dp; dp = null; try { p.prompt(); p.userChoice.then(function (c) { if (c && c.outcome === 'accepted') { EH.ss.del('eh_inst_force'); } EH.emit('install'); }, function () {}); } catch (e) {} return; }
    EH.toast(ios ? 'Tap the Share icon, then "Add to Home Screen"' : 'Open the browser menu and choose "Install app" or "Add to Home screen"');
  };
  document.addEventListener('click', function (e) {
    var t = e.target && e.target.closest ? e.target.closest('[data-inst-go],[data-inst-x]') : null; if (!t) return;
    if (t.hasAttribute('data-inst-go')) { EH.buzz && EH.buzz(8); EH.install(); }
    else { EH.ss.del('eh_inst_force'); EH.ls.set('eh_inst_dis', String(Date.now())); EH.emit('install'); }
  });
})();
