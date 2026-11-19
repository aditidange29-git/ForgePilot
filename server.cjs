const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const WEBVIEW_DIR = path.join(__dirname, 'src', 'webview');

const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];

  if (url === '/' || url === '/index.html') {
    const htmlPath = path.join(WEBVIEW_DIR, 'index.html');
    let html = fs.readFileSync(htmlPath, 'utf8');

    html = html
      .replace(/\{\{CSP_SOURCE\}\}/g, "'self' 'unsafe-inline'")
      .replace(/\{\{NONCE\}\}/g, 'forgepilot-dev')
      .replace(/\{\{STYLES_URI\}\}/g, '/styles.css')
      .replace(/\{\{SCRIPT_URI\}\}/g, '/script.js');

    const mockVsCodeScript = `
    <script nonce="forgepilot-dev">
      (function() {
        let _state = {};
        let _currentConvId = 'conv-' + Date.now();
        let _selectedCode = 'function calculateTotal(items) {\\n  return items.reduce((sum, item) => sum + item.price, 0);\\n}';

        window.acquireVsCodeApi = function() {
          return {
            postMessage: function(msg) {
              handleExtensionHostMessage(msg);
            },
            getState: function() { return _state; },
            setState: function(s) { _state = s; }
          };
        };

        async function handleExtensionHostMessage(msg) {
          if (!msg || !msg.type) return;

          switch (msg.type) {
            case 'WEBVIEW_READY':
              setTimeout(() => {
                window.postMessage({
                  type: 'CHAT_CLEARED',
                  payload: {
                    newConversationId: _currentConvId,
                    mode: 'chat',
                    messages: [],
                    status: 'ready'
                  }
                }, '*');
                window.postMessage({
                  type: 'STATUS_UPDATE',
                  payload: { status: 'ready' }
                }, '*');
              }, 100);
              break;

            case 'INLINE_CONTEXT_REQUEST':
              window.postMessage({
                type: 'INLINE_CONTEXT',
                payload: { selectedCode: _selectedCode }
              }, '*');
              break;

            case 'CANCEL_REQUEST':
              window.postMessage({
                type: 'STATUS_UPDATE',
                payload: { status: 'ready' }
              }, '*');
              break;

            case 'NEW_CHAT':
            case 'CLEAR_CHAT':
              _currentConvId = 'conv-' + Date.now();
              window.postMessage({
                type: 'CHAT_CLEARED',
                payload: {
                  newConversationId: _currentConvId,
                  mode: 'chat',
                  messages: [],
                  status: 'ready'
                }
              }, '*');
              break;

            case 'SEND_MESSAGE': {
              const text = msg.payload ? msg.payload.message : '';
              const userMsgId = 'msg-' + Date.now() + '-u';
              const asstMsgId = 'msg-' + Date.now() + '-a';

              window.postMessage({
                type: 'MESSAGE_RECEIVED',
                payload: {
                  messageId: userMsgId,
                  role: 'user',
                  content: text,
                  timestamp: Date.now()
                }
              }, '*');

              window.postMessage({
                type: 'STATUS_UPDATE',
                payload: { status: 'working' }
              }, '*');

              // Create placeholder bubble
              window.postMessage({
                type: 'MESSAGE_RECEIVED',
                payload: {
                  messageId: asstMsgId,
                  role: 'assistant',
                  content: '',
                  timestamp: Date.now()
                }
              }, '*');

              // Delegate to port 8790 backend session turn
              try {
                const sessionRes = await fetch('http://localhost:8790/api/v1/sessions', { method: 'POST' });
                const sessionData = await sessionRes.json();
                const turnRes = await fetch('http://localhost:8790/api/v1/sessions/' + sessionData.data.id + '/turns', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ input: [{ type: 'user.message', content: text }] })
                });

                const reader = turnRes.body.getReader();
                const decoder = new TextDecoder();
                let buffer = '';

                while (true) {
                  const { done, value } = await reader.read();
                  if (done) break;
                  buffer += decoder.decode(value, { stream: true });
                  const lines = buffer.split('\\n');
                  buffer = lines.pop();

                  for (const line of lines) {
                    if (line.startsWith('data: ')) {
                      try {
                        const parsed = JSON.parse(line.slice(6));
                        if (parsed.type === 'model.message.delta' && parsed.content) {
                          window.postMessage({
                            type: 'MESSAGE_DELTA',
                            payload: {
                              messageId: asstMsgId,
                              delta: parsed.content
                            }
                          }, '*');
                        }
                      } catch (e) {}
                    }
                  }
                }
              } catch (err) {
                window.postMessage({
                  type: 'MESSAGE_DELTA',
                  payload: {
                    messageId: asstMsgId,
                    delta: 'Error connecting to backend: ' + err.message
                  }
                }, '*');
              }

              window.postMessage({
                type: 'STATUS_UPDATE',
                payload: { status: 'ready' }
              }, '*');
              break;
            }

            case 'INLINE_EDIT_REQUEST': {
              const instruction = msg.payload ? msg.payload.instruction : '';
              const fullPrompt = 'Selected code:\n' + _selectedCode + '\n\nInstruction: ' + instruction;
              handleExtensionHostMessage({ type: 'SEND_MESSAGE', payload: { message: fullPrompt } });
              break;
            }
          }
        }
      })();
    </script>
    `;

    html = html.replace(/<meta\s+http-equiv="Content-Security-Policy"[^>]*>/i, '');
    html = html.replace('</head>', `${mockVsCodeScript}\n</head>`);

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
  } else if (url === '/styles.css') {
    const cssPath = path.join(WEBVIEW_DIR, 'styles.css');
    const css = fs.readFileSync(cssPath, 'utf8');
    res.writeHead(200, { 'Content-Type': 'text/css; charset=utf-8' });
    res.end(css);
  } else if (url === '/script.js') {
    const jsPath = path.join(WEBVIEW_DIR, 'script.js');
    const js = fs.readFileSync(jsPath, 'utf8');
    res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8' });
    res.end(js);
  } else if (url === '/preview') {
    const previewHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>ForgePilot Phase 2 (Gemini Powered)</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #141414;
      color: #e0e0e0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      flex-direction: column;
      height: 100vh;
      overflow: hidden;
    }
    .topbar {
      background: #1f1f1f;
      border-bottom: 1px solid #333;
      padding: 10px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 13px;
    }
    .topbar-badge {
      background: #1a73e8;
      color: white;
      padding: 3px 8px;
      border-radius: 3px;
      font-weight: 600;
      font-size: 11px;
    }
    .main-container {
      flex: 1;
      display: flex;
      justify-content: center;
      align-items: center;
      background: #0f0f0f;
      padding: 16px;
    }
    .ide-window {
      width: 100%;
      max-width: 480px;
      height: 92vh;
      background: #1e1e1e;
      border-radius: 8px;
      box-shadow: 0 12px 35px rgba(0,0,0,0.7);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      border: 1px solid #383838;
    }
    .window-header {
      background: #252526;
      padding: 8px 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid #333;
    }
    .dots { display: flex; gap: 6px; }
    .dot { width: 10px; height: 10px; border-radius: 50%; }
    .dot.red { background: #ff5f56; }
    .dot.yellow { background: #ffbd2e; }
    .dot.green { background: #27c93f; }
    .window-title {
      font-size: 12px;
      color: #bbb;
      font-weight: 500;
    }
    iframe {
      flex: 1;
      border: none;
      width: 100%;
      height: 100%;
    }
  </style>
</head>
<body>
  <div class="topbar">
    <div style="display:flex;align-items:center;gap:10px;">
      <span class="topbar-badge">Gemini Powered</span>
      <span>ForgePilot Dev Preview — Port ${PORT}</span>
    </div>
  </div>
  <div class="main-container">
    <div class="ide-window">
      <div class="window-header">
        <div class="dots">
          <div class="dot red"></div>
          <div class="dot yellow"></div>
          <div class="dot green"></div>
        </div>
        <div class="window-title">ForgePilot (Google Gemini Live)</div>
        <div style="font-size:11px;color:#858585;">Ready</div>
      </div>
      <iframe src="/"></iframe>
    </div>
  </div>
</body>
</html>`;
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(previewHtml);
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[ForgePilot] Web preview server running on port ${PORT}`);
});
