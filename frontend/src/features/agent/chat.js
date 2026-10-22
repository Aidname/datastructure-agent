import { createAgentChat } from './panel.js';
const panel = createAgentChat(document.querySelector('.chat-container'));
window.addEventListener('pagehide', () => panel.destroy(), { once: true });
window.addEventListener('pageshow', event => { if (event.persisted) location.reload(); });
