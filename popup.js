(() => {
  'use strict';
  const toggle=document.getElementById('toggle'), status=document.getElementById('status'), mode=document.getElementById('mode');
  function say(msg,bad=false){ status.textContent=msg; status.style.color=bad?'#ffa6b2':'#cfc2db'; }
  async function refresh(){
    try {
      const [rules,code]=await Promise.all([
        chrome.declarativeNetRequest.getEnabledRulesets(),
        fetch(chrome.runtime.getURL('adblock_video.js')).then(r=>r.text())
      ]);
      const full=!code.includes('MK_SIMPLE_MODE');
      mode.textContent=full?'Modo VAFT: bloqueio de vídeo':'Modo básico: VAFT não instalado';
      const enabled=rules.includes('twitch_ad_filters');toggle.checked=enabled;
      await chrome.storage.local.set({mkAdBlockEnabled:enabled});
      say(enabled?'Ativado. Atualize a aba Twitch após mudanças.':'Desativado.');
    } catch(e){say('Não foi possível ler o estado do AdBlock',true); console.warn(e);}
  }
  toggle.addEventListener('change',async()=>{
    const enabled=toggle.checked;toggle.disabled=true;
    try {
      await chrome.declarativeNetRequest.updateEnabledRulesets({
        enableRulesetIds:enabled?['twitch_ad_filters']:[],
        disableRulesetIds:enabled?[]:['twitch_ad_filters']
      });
      await chrome.storage.local.set({mkAdBlockEnabled:enabled});
      const res=await chrome.runtime.sendMessage({type:'mk-set-video-adblock',enabled});
      if(!res?.ok) throw Error(res?.message||'Erro no script de vídeo');
      say(enabled?'AdBlock ativado. Recarregue a Twitch (Ctrl+R).':'AdBlock desligado. Recarregue a Twitch (Ctrl+R).');
    }catch(e){say('Erro ao alterar bloqueio: '+e.message,true);toggle.checked=!enabled;}
    toggle.disabled=false;
  });
  refresh();
})();
