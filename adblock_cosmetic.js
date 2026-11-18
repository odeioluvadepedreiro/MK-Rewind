/* MK Rewind AdBlock - filtros cosméticos locais. Não bloqueia os anúncios SSAI inseridos no vídeo. */
(() => {
  'use strict';
  const STYLE_ID = 'mk-rewind-adblock-style';
  const CSS = `
    [data-a-target="banner-ad-container"],
    [data-test-selector="display-ad"],
    [data-test-selector="ad-banner-default-container"],
    [data-test-selector="ad-banner-default-text-container"],
    [data-a-target="stream-display-ad"],
    .stream-display-ad__container,
    .stream-display-ad { display:none!important;visibility:hidden!important; }
  `;
  function paint(enabled) {
    let style=document.getElementById(STYLE_ID);
    if (enabled) {
      if (style) return;
      style=document.createElement('style');style.id=STYLE_ID;style.textContent=CSS;
      (document.head||document.documentElement).appendChild(style);
    } else if (style) style.remove();
  }
  // Um armazenamento de controle, não uma telemetria de navegação.
  chrome.storage.local.get({mkAdBlockEnabled:true}, ({mkAdBlockEnabled}) => paint(mkAdBlockEnabled));
  chrome.storage.onChanged.addListener((changes,area)=>{
    if (area==='local'&&changes.mkAdBlockEnabled) paint(changes.mkAdBlockEnabled.newValue!==false);
  });
})();
