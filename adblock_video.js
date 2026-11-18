/* MK_SIMPLE_MODE — bloqueio experimental: tenta usar o token do player popout
 * apenas nas lives. Para anúncios inseridos nos segmentos HLS, use ATIVAR-VAFT.cmd.
 * Sem código baixado ou executado remotamente.
 */
(() => {
  'use strict';
  if (window.__mkAdBlockSimple) return;
  window.__mkAdBlockSimple = true;
  const origFetch = window.fetch;
  const GQL = 'gql.twitch.tv/gql';
  const transform = raw => {
    let data;
    try {data=JSON.parse(raw);} catch {return null;}
    let changed=false;
    const visit = item => {
      if (!item || typeof item !== 'object' || !item.variables) return;
      const q=String(item.query||'')+' '+String(item.operationName||'');
      if (!q.includes('streamPlaybackAccessToken') && !q.includes('PlaybackAccessToken')) return;
      if (item.variables.isLive === false || item.variables.isVod === true) return;
      if (typeof item.variables.playerType !== 'string') return;
      if (item.variables.playerType==='site' || item.variables.playerType==='mediaplayer') {
        item.variables.playerType='popout'; changed=true;
      }
    };
    if (Array.isArray(data)) data.forEach(visit); else visit(data);
    return changed ? JSON.stringify(data) : null;
  };
  window.fetch = function(input, init) {
    let u;
    try {u = typeof input==='string' ? input : input?.url || String(input);} catch {return origFetch.apply(this,arguments);}
    if (!u.includes(GQL)) return origFetch.apply(this,arguments);
    const context=this;
    const originalArgs=arguments;
    return (async()=>{
      try {
        const text = typeof init?.body==='string' ? init.body
           : input instanceof Request ? await input.clone().text() : null;
        if (text==null) return origFetch.apply(context,originalArgs);
        const replaced=transform(text);
        if (!replaced) return origFetch.apply(context,originalArgs);
        const newInput= input instanceof Request ? new Request(input,{body:replaced}) : input;
        const newInit= input instanceof Request ? init : {...init,body:replaced};
        const result=await origFetch.call(context,newInput,newInit);
        if (!result.ok) return origFetch.apply(context,originalArgs);
        let data;
        try {data=await result.clone().json();}catch{return result;}
        const items=Array.isArray(data)?data:[data];
        const missing=items.some(x=>x?.errors?.length && !x?.data?.streamPlaybackAccessToken);
        if (missing) return origFetch.apply(context,originalArgs);
        return result;
      }catch(e){
        return origFetch.apply(context,originalArgs);
      }
    })();
  };
  console.info('[MK Rewind] Video AdBlock basico ativo (nao garante remover comerciais SSAI).');
})();
