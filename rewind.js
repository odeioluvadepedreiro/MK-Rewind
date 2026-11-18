/* MK Rewind v4.1 — overlay com Twitch Embed Player oficial, sem gravação da aba.
 * Origem de mídia: VOD da live que a Twitch esteja gravando/publicando.
 * Sem cookies, senha, tokens privados, downloads nem servidores de terceiros.
 */
(() => {
  'use strict';
  if (window.__MK_REWIND_V4__) return;
  Object.defineProperty(window, '__MK_REWIND_V4__', { value: true, configurable: false });

  const GQL = 'https://gql.twitch.tv/gql';
  const PUBLIC_CLIENT_ID = 'kimne78kx3ncx6brgo4mv6wki5h1ko';
  const API_RETRY_MS = 30_000;
  const MAX_API_WAIT_MS = 10_000;
  const MIN_VOD_DELAY = 18; // Últimos segmentos ainda podem não estar prontos.
  const RESERVED = new Set('directory videos search settings downloads subscriptions turbo inventory wallet drops login signup clip clips p embed popout collections moderation moderator friends dashboard messages products jobs'.split(' '));

  const st = {
    channel: null, nav: 0, video: null, host: null, ui: null, controls: {},
    vod: null, checked: 0, checking: false, checkError: '',
    archive: false, player: null, layer: null, mount: null,
    requested: null, current: 0, playing: true, seekDragging: false,
    originalMuted: null, originalVolume: null, originalPosition: '', adjustedPosition: false,
    initSeq: 0, sdkPromise: null, statusTimer: null, loading: false
  };

  function channelFromPath() {
    const p = location.pathname.split('/').filter(Boolean);
    return p.length === 1 && /^[a-z0-9_]{3,25}$/i.test(p[0]) && !RESERVED.has(p[0].toLowerCase())
      ? p[0].toLowerCase() : null;
  }
  const fmt = (n) => {
    n = Math.max(0, Math.floor(Number(n) || 0));
    const h = Math.floor(n / 3600), m = Math.floor((n % 3600) / 60), s = n % 60;
    return h ? `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}` : `${m}:${String(s).padStart(2,'0')}`;
  };
  const clamp = (n,a,b) => Math.min(b,Math.max(a,Number(n) || 0));
  const el = (tag, className = '', text = '') => {
    const e = document.createElement(tag); if (className) e.className = className;
    if (text) e.textContent = text; return e;
  };
  function findVideo() {
    const a = [...document.querySelectorAll('video')].filter(v => {
      if (st.layer?.contains(v)) return false;
      const r=v.getBoundingClientRect(); return r.width >= 240 && r.height >= 130 && getComputedStyle(v).visibility !== 'hidden';
    });
    a.sort((x,y)=>{const A=x.getBoundingClientRect(),B=y.getBoundingClientRect();return B.width*B.height-A.width*A.height});
    return a[0] || null;
  }
  function findHost(video) {
    return video?.closest('.video-player__container,[data-a-target="video-player"],.video-player,.persistent-player') || video?.parentElement?.parentElement;
  }
  function elapsed() {
    const t = Date.parse(st.vod?.createdAt || '');
    return Number.isFinite(t) ? Math.max(0,(Date.now()-t)/1000) : 0;
  }
  function maxSeek() { return Math.max(0, elapsed() - MIN_VOD_DELAY); }
  function toast(message) {
    if (!st.ui) return;
    const box = st.controls.status;
    box.textContent = message; box.hidden = false;
    clearTimeout(st.statusTimer);
    st.statusTimer = setTimeout(() => { if (box) box.hidden=true; }, 6500);
  }
  async function fetchCurrentRecording(channel, signal) {
    const query = 'query($login:String!){user(login:$login){videos(first:5,sort:TIME,type:ARCHIVE){edges{node{id createdAt status}}}}}';
    const r = await fetch(GQL, {
      method: 'POST', headers: {'Client-ID':PUBLIC_CLIENT_ID,'Content-Type':'application/json'},
      body: JSON.stringify({query,variables:{login:channel}}), credentials:'omit', signal
    });
    if (!r.ok) throw new Error('API Twitch: HTTP '+r.status);
    const payload = await r.json();
    const user = payload?.data?.user;
    if (!user && !payload?.errors?.length) return null;
    const edges = user?.videos?.edges;
    if (!Array.isArray(edges)) throw new Error(payload?.errors?.[0]?.message || 'A resposta da API mudou');
    const vod = edges.map(x=>x?.node).find(x=>x?.status==='RECORDING' && /^\d+$/.test(String(x?.id)) && Number.isFinite(Date.parse(x?.createdAt)));
    return vod ? {id:String(vod.id),createdAt:vod.createdAt} : null;
  }
  async function checkRecording(force = false) {
    if (!st.channel || !st.video || st.checking) return;
    if (!force && Date.now() - st.checked < API_RETRY_MS) return;
    st.checked = Date.now(); st.checking = true;
    const generation=st.nav, channel=st.channel;
    const controller = new AbortController();
    const timer = setTimeout(()=>controller.abort(),MAX_API_WAIT_MS);
    try {
      const vod = await fetchCurrentRecording(channel,controller.signal);
      if (st.nav!==generation || st.channel!==channel) return;
      st.checkError='';
      if (st.vod && vod && st.vod.id!==vod.id) stopArchive();
      if (!vod && st.archive) stopArchive();
      st.vod=vod;
    } catch(e) {
      if (st.nav===generation) st.checkError=e?.message || 'Erro ao consultar a Twitch';
    } finally {
      clearTimeout(timer);
      if (st.nav===generation) st.checking=false;
    }
  }

  function button(caption,title,action,style='') {
    const b=el('button','mkr4-button '+style,caption);
    b.type='button'; b.title=title;
    b.addEventListener('click', e=>{e.preventDefault();e.stopPropagation();action();});
    return b;
  }
  function buildUI() {
    if (!st.host) return;
    if (getComputedStyle(st.host).position==='static') {
      st.originalPosition=st.host.style.position; st.host.style.position='relative'; st.adjustedPosition=true;
    }
    const root=el('div','mkr4-root'); root.id='mkr4-root';
    root.setAttribute('aria-label','Barra de retrocesso da live');
    root.dataset.mkrMode = 'live';
    const toolbar=el('div','mkr4-toolbar');
    const left=el('span','mkr4-current','AO VIVO');
    const info=el('span','mkr4-info','Buscando gravação da live…');
    toolbar.append(button('−10 s','Retroceder dez segundos',()=>seekRelative(-10)),
      button('−30 s','Retroceder trinta segundos',()=>seekRelative(-30)),
      button('−5 min','Retroceder cinco minutos',()=>seekRelative(-300)),info);
    const bar=el('div','mkr4-bar');
    const range=el('input','mkr4-range'); range.type='range';
    range.min='0';range.max='1000';range.step='1';range.value='1000';
    range.setAttribute('aria-label','Linha do tempo da transmissão');
    const live=button('● AO VIVO','Retornar à live em tempo real',goLive,'mkr4-live');
    bar.append(left,range,live);
    const tooltip=el('div','mkr4-tooltip'); tooltip.hidden=true;
    const status=el('div','mkr4-status');status.hidden=true;status.setAttribute('role','status');
    root.append(toolbar,bar,tooltip,status); st.host.append(root);
    st.ui=root; st.controls={left,info,range,live,tooltip,status};
    const preview=()=>{
      const offset=clamp(Number(range.value)/1000*maxSeek(),0,maxSeek());
      tooltip.textContent=`${fmt(offset)} / ${fmt(elapsed())}`;
      tooltip.style.left=`${Math.round(52+(Number(range.value)/1000)*65)}%`;
      tooltip.hidden=false;
    };
    range.addEventListener('pointerdown',()=>{st.seekDragging=true;});
    range.addEventListener('input',e=>{e.stopPropagation();st.seekDragging=true;preview();});
    range.addEventListener('change',e=>{
      e.stopPropagation();
      const seconds=clamp(Number(range.value)/1000*maxSeek(),0,maxSeek());
      st.seekDragging=false;tooltip.hidden=true;
      if (Number(range.value)>=995) goLive(); else seekTo(seconds);
    });
    range.addEventListener('pointercancel',()=>{st.seekDragging=false;tooltip.hidden=true;});
    range.addEventListener('pointerup',()=>setTimeout(()=>{st.seekDragging=false;tooltip.hidden=true;},90));
    range.addEventListener('click',e=>e.stopPropagation());
    return root;
  }
  function paint() {
    if (!st.ui) return;
    // No replay o player oficial de VOD já tem uma timeline completa.
    // Ocultar a timeline própria evita as duas barras sobrepostas.
    // Ao voltar ao vivo, a timeline da extensão reaparece para iniciar novo replay.
    st.ui.dataset.mkrMode = st.archive ? 'replay' : 'live';
    const {range,left,info,live}=st.controls;
    if (!st.vod) {
      range.disabled=true;range.value='1000'; range.style.setProperty('--fill','100%');
      left.textContent='AO VIVO';
      info.textContent=st.checkError ? `Erro: ${st.checkError}` : st.checking ? 'Procurando a gravação atual…' : 'Sem gravação disponível nesta live';
      live.dataset.live='true';
      return;
    }
    const max=maxSeek();range.disabled=max<8;
    if (st.archive && st.player) {
      try { const t=st.player.getCurrentTime();if(Number.isFinite(t) && t>=0)st.current=t; }catch(_){ /* player ainda inicializando */ }
    } else if (!st.archive) st.current=elapsed();
    const current=st.archive?clamp(st.current,0,max):max;
    left.textContent=st.archive?fmt(current):'AO VIVO';
    live.dataset.live=String(!st.archive);
    info.textContent=`Live ${fmt(elapsed())} · ${st.archive?'reproduzindo trecho anterior':'pronto para retroceder'}`;
    if (!st.seekDragging) {
      const percent=max>0?clamp(current/max*100,0,100):100;
      range.value=String(Math.round(percent*10));
      range.style.setProperty('--fill',`${percent}%`);
    }
  }
  async function loadSdk() {
    if (window.Twitch?.Player) return;
    if (st.sdkPromise) return st.sdkPromise;
    st.sdkPromise=new Promise((resolve,reject)=>{
      const script=document.createElement('script');
      script.src='https://player.twitch.tv/js/embed/v1.js'; script.async=true;
      const timer=setTimeout(()=>{script.remove();reject(new Error('Tempo esgotado ao carregar player da Twitch'));},14000);
      script.onload=()=>{clearTimeout(timer); if(window.Twitch?.Player)resolve();else reject(new Error('Player oficial não encontrado'));};
      script.onerror=()=>{clearTimeout(timer);reject(new Error('O Chrome bloqueou o player incorporado'));};
      (document.head||document.documentElement).append(script);
    }).catch(e=>{st.sdkPromise=null;throw e;});
    return st.sdkPromise;
  }
  function ensureLayer() {
    if (st.layer?.isConnected && st.mount?.isConnected) return;
    st.layer=el('div','mkr4-layer');
    st.mount=el('div','mkr4-player');
    st.mount.id='mkr4-embed-'+Math.random().toString(36).slice(2);
    st.layer.append(st.mount);st.host.append(st.layer);
  }
  function muteNative() {
    if (!st.video) return;
    if (st.originalMuted===null) {st.originalMuted=st.video.muted;st.originalVolume=st.video.volume;}
    st.video.muted=true;
  }
  function restoreNative() {
    if (!st.video || st.originalMuted===null) return;
    st.video.muted=st.originalMuted;
    st.video.volume=st.originalVolume;
    st.originalMuted=null;st.originalVolume=null;
  }
  async function seekTo(second) {
    if (!st.vod) {
      toast(st.checkError ? `Falha ao buscar gravação: ${st.checkError}` : 'Este canal não disponibiliza a gravação da live. Não é possível voltar antes de começar a assistir sem uma fonte gravada.');
      return;
    }
    const max=maxSeek();
    if (max<8){toast('A live começou há pouco: ainda não existe trecho anterior disponível.');return;}
    const wanted=clamp(second,0,max);
    if (st.archive && st.player && !st.loading) {
      try {st.player.seek(wanted);st.current=wanted;paint();return;}catch(e){console.warn('[MK Rewind] seek:',e);}
    }
    st.requested=wanted;st.current=wanted;
    if (st.loading) return;
    const seq=++st.initSeq, nav=st.nav;
    st.archive=true;st.loading=true;
    muteNative();ensureLayer();paint();
    try {
      await loadSdk();
      if (seq!==st.initSeq || nav!==st.nav || !st.archive) return;
      const container=st.mount.id;
      const player=new window.Twitch.Player(container,{
        video:'v'+st.vod.id,width:'100%',height:'100%',
        autoplay:true,muted:false,parent:[location.hostname]
      });
      st.player=player;
      const doInitialSeek=()=>{
        if(seq!==st.initSeq||!st.archive)return;
        const target=st.requested;
        if (target===null)return;
        st.requested=null;
        try{player.seek(target);st.current=target;}catch(e){toast('A gravação abriu, mas a Twitch não aceitou o ponto escolhido.');}
        paint();
      };
      player.addEventListener(window.Twitch.Player.READY,()=>{
        if(seq!==st.initSeq)return;
        // No READY a mídia pode ainda estar carregando; repetir uma vez no PLAY.
        doInitialSeek();
      });
      player.addEventListener(window.Twitch.Player.PLAY,()=>{
        if(seq!==st.initSeq)return;
        st.playing=true;
        if(st.requested!==null)doInitialSeek();
      });
      // READY pode ocorrer antes de a playlist chegar: confirma o salto quando o vídeo tocar.
      let verified=false;
      player.addEventListener(window.Twitch.Player.PLAYING,()=>{
        if(seq!==st.initSeq || verified || !st.archive)return;
        verified=true;
        setTimeout(()=>{
          if(seq!==st.initSeq || !st.archive)return;
          try{
            const actual=player.getCurrentTime();
            if(Number.isFinite(actual) && Math.abs(actual-st.current)>15 && st.current>20){
              player.seek(st.current);
            }
          }catch(_){ }
        },600);
      });
      player.addEventListener(window.Twitch.Player.PAUSE,()=>{if(seq===st.initSeq)st.playing=false;});
      player.addEventListener(window.Twitch.Player.SEEK,()=>paint());
      // Evita deixar tela congelada indefinidamente sem resposta do embed.
      setTimeout(()=>{
        if(seq!==st.initSeq || !st.archive)return;
        try{ if(!player.getVideo()) toast('O player incorporado não conseguiu carregar esta gravação. Ela pode estar indisponível ou restrita.'); }
        catch(_){ /* SDK ainda carregando */ }
      },12000);
    } catch (error) {
      console.error('[MK Rewind] Falha no replay:',error);
      if (seq===st.initSeq) { goLive();toast(`Não foi possível iniciar o replay: ${error.message}`); }
    } finally {
      if(seq===st.initSeq)st.loading=false;
    }
  }
  function seekRelative(delta) {
    if (!st.vod){seekTo(0);return;}
    const t=st.archive?st.current:maxSeek();
    seekTo(t+delta);
  }
  function stopArchive() {
    ++st.initSeq;st.loading=false;st.archive=false;st.requested=null;
    if (st.player) {
      try {st.player.pause();}catch(_){ }
      // The official embed API has no destroy() across all versions. Remove DOM.
      st.player=null;
    }
    if(st.layer){st.layer.remove();st.layer=null;st.mount=null;}
    restoreNative();
  }
  function goLive() {
    stopArchive();
    try{st.video?.play().catch(()=>{});}catch(_){ }
    paint();
  }
  function detach() {
    stopArchive();
    if (st.ui){st.ui.remove();st.ui=null;}
    if (st.host && st.adjustedPosition) st.host.style.position=st.originalPosition;
    st.originalPosition='';st.adjustedPosition=false;
    st.video=null;st.host=null;st.controls={};
  }
  function tick() {
    const channel=channelFromPath();
    if(channel!==st.channel){
      st.nav++;detach();st.channel=channel;st.vod=null;st.checked=0;st.checking=false;st.checkError='';
    }
    if(!channel) return;
    const video=findVideo(); const host=findHost(video);
    if (video!==st.video || host!==st.host || (st.ui && !st.ui.isConnected)) {
      if(st.video||st.ui)detach();
      if (video&&host){st.video=video;st.host=host;buildUI();}
    }
    if(!st.ui)return;
    checkRecording();paint();
  }
  window.addEventListener('popstate',tick);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)tick();});
  setInterval(tick,800);
  tick();
})();
