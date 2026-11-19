const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8790;
const KEY_FILE = path.join(__dirname, 'gemini-api-key.txt');
const ENV_FILE = path.join(__dirname, '.env');

function getGeminiKey() {
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim()) {
    return process.env.GEMINI_API_KEY.trim();
  }
  const searchFiles = [
    KEY_FILE,
    ENV_FILE,
    path.join(__dirname, '..', 'gemini-api-key.txt'),
    path.join(__dirname, '..', '.env'),
    'C:\\Users\\USER\\Desktop\\tf phase 2\\ForgePilot\\gemini-api-key.txt',
    'C:\\Users\\USER\\Desktop\\tf phase 2\\ForgePilot\\.env'
  ];
  for (const f of searchFiles) {
    if (fs.existsSync(f)) {
      const content = fs.readFileSync(f, 'utf8').trim();
      const match = content.match(/GEMINI_API_KEY\s*=\s*([^\r\n]+)/i);
      if (match && match[1].trim()) return match[1].trim().replace(/^["']|["']$/g, '');
      if (content.startsWith('AQ.') || content.startsWith('AIza')) return content;
    }
  }
  return null;
}

function saveGeminiKey(key) {
  const clean = key.trim();
  fs.writeFileSync(KEY_FILE, clean, 'utf8');
  fs.writeFileSync(ENV_FILE, `GEMINI_API_KEY=${clean}\n`, 'utf8');
  try {
    fs.writeFileSync('C:\\Users\\USER\\Desktop\\tf phase 2\\ForgePilot\\gemini-api-key.txt', clean, 'utf8');
    fs.writeFileSync('C:\\Users\\USER\\Desktop\\tf phase 2\\ForgePilot\\.env', `GEMINI_API_KEY=${clean}\n`, 'utf8');
  } catch (e) {}
}

async function streamFromGemini(prompt, res, messageId) {
  const apiKey = getGeminiKey();
  // Try 3.5-flash-lite (fast & robust), 4-argon, and 3.8-flash
  const modelsToTry = ['gemini-3.5-flash-lite', 'gemini-4-argon', 'gemini-3.8-flash'];

  for (const model of modelsToTry) {
    const url = `https://generativelanguage.googleapis.com/v1beta/interactions?key=${apiKey}`;
    try {
      console.log(`[Gemini] Calling ${model}...`);
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model,
          input: prompt,
          system_instruction: "You are ForgePilot, an AI Engineering Teammate built for Visual Studio Code powered by the TrueForge agent runtime. " +
            "Your role is to help developers understand software, debug errors, refactor code, and provide clean, production-grade solutions. " +
            "When code or instructions are provided, analyze thoroughly, explain bugs, and provide corrected code blocks with proper syntax.",
          stream: true
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        console.warn(`[Gemini ${model}] returned ${response.status}:`, errText);
        if ((response.status === 503 || response.status === 404) && model !== modelsToTry[modelsToTry.length - 1]) {
          continue; // Try next model
        }
        throw new Error(`Gemini status ${response.status}: ${errText}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            const dataStr = trimmed.slice(6).trim();
            if (dataStr === '[DONE]') continue;
            try {
              const ev = JSON.parse(dataStr);
              if (ev.event_type === 'step.delta' && ev.delta && ev.delta.text) {
                const deltaEvent = {
                  id: messageId,
                  type: "model.message.delta",
                  thread_id: "main",
                  content: ev.delta.text,
                  created_at: new Date().toISOString()
                };
                res.write(`data: ${JSON.stringify(deltaEvent)}\n\n`);
              }
            } catch (err) {
              // ignore non-json chunk
            }
          }
        }
      }

      console.log(`[Gemini ${model}] Stream finished successfully.`);
      return true;
    } catch (err) {
      console.error(`[Gemini ${model}] Error:`, err.message);
      if (model === modelsToTry[modelsToTry.length - 1]) {
        throw err;
      }
    }
  }
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;
  const method = req.method;

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // 1. Capabilities
  if (pathname === '/api/v1/capabilities' && method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ data: {} }));
    return;
  }

  // 2. Models
  if (pathname === '/api/v1/models' && method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      data: [
        {
          name: "gemini-3.5-flash-lite",
          displayName: "Google Gemini (TrueForge Live)"
        }
      ]
    }));
    return;
  }

  // 3. Create Session
  if (pathname === '/api/v1/sessions' && method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      const sessionId = 'session-' + Date.now();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        data: {
          id: sessionId,
          created_at: new Date().toISOString()
        }
      }));
    });
    return;
  }

  // 4. Patch Session
  if (pathname.startsWith('/api/v1/sessions/') && method === 'PATCH') {
    const parts = pathname.split('/');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ data: { id: parts[4] } }));
    return;
  }

  // 5. Cancel Session
  if (pathname.startsWith('/api/v1/sessions/') && pathname.endsWith('/cancel') && method === 'POST') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ data: { status: 'cancelled' } }));
    return;
  }

  // 6. Turns (Streaming SSE)
  if (pathname.match(/^\/api\/v1\/sessions\/[^\/]+\/turns$/) && method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      let userPrompt = "Hello";
      try {
        const parsed = JSON.parse(body);
        if (parsed.input && parsed.input[0] && parsed.input[0].content) {
          userPrompt = parsed.input[0].content;
        }
      } catch (e) {}

      res.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive'
      });

      const messageId = 'msg-' + Date.now();
      const apiKey = getGeminiKey();

      if (!apiKey) {
        const guideMsg = "⚠️ **Gemini API Key is not set yet!**\n\nPlease add your API key to `gemini-api-key.txt` or send `key: ...` here.";
        const deltaEvent = {
          id: messageId,
          type: "model.message.delta",
          thread_id: "main",
          content: guideMsg,
          created_at: new Date().toISOString()
        };
        res.write(`data: ${JSON.stringify(deltaEvent)}\n\n`);
      } else {
        try {
          await streamFromGemini(userPrompt, res, messageId);
        } catch (err) {
          const errorMsg = `❌ **Error calling Gemini API:** ${err.message}`;
          const deltaEvent = {
            id: messageId,
            type: "model.message.delta",
            thread_id: "main",
            content: errorMsg,
            created_at: new Date().toISOString()
          };
          res.write(`data: ${JSON.stringify(deltaEvent)}\n\n`);
        }
      }

      // Terminal turn.done event
      const doneEvent = {
        id: 'done-' + Date.now(),
        type: "turn.done",
        thread_id: null,
        created_at: new Date().toISOString(),
        state: {
          status: "done",
          completed_at: new Date().toISOString(),
          output: null,
          required_actions: []
        }
      };
      res.write(`data: ${JSON.stringify(doneEvent)}\n\n`);
      res.end();
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, '0.0.0.0', () => {
  const key = getGeminiKey();
  console.log(`[TrueForge Backend + Gemini Interactions] Server running on http://localhost:${PORT}`);
  console.log(`- Active Gemini Key: ${key ? key.slice(0, 10) + '...' : 'NONE'}`);
});
