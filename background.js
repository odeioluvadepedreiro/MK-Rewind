/* Ativa/desativa o código local de anúncios de vídeo ANTES do carregamento da Twitch. */
const ID = 'mk-video-adblock';
async function syncVideoAdBlock(enabled) {
  const regs = await chrome.scripting.getRegisteredContentScripts({ids:[ID]});
  if (enabled && !regs.length) {
    await chrome.scripting.registerContentScripts([{
      id: ID,
      matches: ['https://www.twitch.tv/*', 'https://twitch.tv/*'],
      js: ['adblock_video.js'],
      world: 'MAIN', runAt: 'document_start',
      allFrames: false, persistAcrossSessions: true
    }]);
  } else if (!enabled && regs.length) {
    await chrome.scripting.unregisterContentScripts({ids:[ID]});
  }
}
async function init() {
  const {mkAdBlockEnabled=true} = await chrome.storage.local.get({mkAdBlockEnabled:true});
  await syncVideoAdBlock(mkAdBlockEnabled);
}
chrome.runtime.onInstalled.addListener(() => { init().catch(console.error); });
chrome.runtime.onStartup.addListener(() => { init().catch(console.error); });
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type !== 'mk-set-video-adblock' || typeof msg.enabled !== 'boolean') return;
  syncVideoAdBlock(msg.enabled)
    .then(() => sendResponse({ok:true}))
    .catch(e => sendResponse({ok:false, message:String(e)}));
  return true;
});
