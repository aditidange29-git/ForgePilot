// @ts-check
/// <reference lib="dom" />
'use strict';

(function () {
  // ── VS Code API ───────────────────────────────────────────────────────────
  // acquireVsCodeApi() must be called exactly once per webview lifetime.
  const vscode = acquireVsCodeApi();

  // ── State ─────────────────────────────────────────────────────────────────
  let conversationId = '';
  let agentMode = false;
  let isWorking = false;

  // ── DOM refs ──────────────────────────────────────────────────────────────
  const conversation    = /** @type {HTMLElement} */ (document.getElementById('conversation'));
  const emptyState      = /** @type {HTMLElement} */ (document.getElementById('empty-state'));
  const messageInput    = /** @type {HTMLTextAreaElement} */ (document.getElementById('message-input'));
  const btnSend         = /** @type {HTMLButtonElement} */ (document.getElementById('btn-send'));
  const btnCancel       = /** @type {HTMLButtonElement} */ (document.getElementById('btn-cancel'));
  const btnNewChat      = /** @type {HTMLButtonElement} */ (document.getElementById('btn-new-chat'));
  const statusBadge     = /** @type {HTMLElement} */ (document.getElementById('status-badge'));
  const agentToggle     = /** @type {HTMLInputElement} */ (document.getElementById('agent-mode-toggle'));
  const modeLabel       = /** @type {HTMLElement} */ (document.getElementById('mode-label'));
  const btnInlineEdit   = /** @type {HTMLButtonElement} */ (document.getElementById('btn-inline-edit'));
  const inlinePanel     = /** @type {HTMLElement} */ (document.getElementById('inline-edit-panel'));
  const btnInlineCancel = /** @type {HTMLButtonElement} */ (document.getElementById('btn-inline-cancel'));
  const btnInlineCancel2= /** @type {HTMLButtonElement} */ (document.getElementById('btn-inline-cancel2'));
  const btnInlineSubmit = /** @type {HTMLButtonElement} */ (document.getElementById('btn-inline-submit'));
  const inlineInstruction=/** @type {HTMLTextAreaElement} */(document.getElementById('inline-instruction'));
  const inlineCodePreview=/** @type {HTMLElement} */(document.getElementById('inline-code-preview'));
  const messagesById = new Map();

  // ── Helpers ───────────────────────────────────────────────────────────────

  function hideEmptyState() {
    if (emptyState && !emptyState.classList.contains('fp-hidden')) {
      emptyState.classList.add('fp-hidden');
    }
  }

  function showEmptyState() {
    if (emptyState) {
      emptyState.classList.remove('fp-hidden');
    }
  }

  /**
   * @param {'user'|'assistant'} role
   * @param {string} content
   * @param {string} [id]
   */
  function appendMessage(role, content, id) {
    hideEmptyState();
    const article = document.createElement('article');
    article.className = 'fp-message fp-message--' + role;
    if (id) { article.dataset.msgId = id; }

    const roleEl = document.createElement('div');
    roleEl.className = 'fp-message__role';
    roleEl.textContent = role === 'user' ? 'You' : 'ForgePilot';

    const bubble = document.createElement('div');
    bubble.className = 'fp-message__bubble';
    bubble.textContent = content;

    article.appendChild(roleEl);
    article.appendChild(bubble);
    conversation.appendChild(article);
    if (id) { messagesById.set(id, bubble); }
    scrollToBottom();
  }

  function appendLoadingIndicator() {
    hideEmptyState();
    const div = document.createElement('div');
    div.id = 'fp-loading';
    div.className = 'fp-loading';
    div.setAttribute('aria-label', 'ForgePilot is thinking');
    div.innerHTML =
      '<span class="fp-loading__dot"></span>' +
      '<span class="fp-loading__dot"></span>' +
      '<span class="fp-loading__dot"></span>' +
      '<span style="font-size:11px;margin-left:4px;color:var(--fp-fg-muted)">Working…</span>';
    conversation.appendChild(div);
    scrollToBottom();
  }

  function removeLoadingIndicator() {
    const el = document.getElementById('fp-loading');
    if (el) { el.remove(); }
  }

  /** @param {string} msg */
  function appendError(msg) {
    hideEmptyState();
    const div = document.createElement('div');
    div.className = 'fp-error-msg';
    div.textContent = '⚠ ' + msg;
    conversation.appendChild(div);
    scrollToBottom();
  }

  function scrollToBottom() {
    conversation.scrollTop = conversation.scrollHeight;
  }

  function updateSendButton() {
    const hasText = messageInput.value.trim().length > 0;
    btnSend.disabled = !conversationId || !hasText || isWorking;
  }

  function autoResizeTextarea() {
    messageInput.style.height = 'auto';
    messageInput.style.height = Math.min(messageInput.scrollHeight, 120) + 'px';
  }

  // ── Status update ─────────────────────────────────────────────────────────

  const STATUS_LABELS = {
    'not-connected': 'Not Connected',
    'connecting':    'Connecting…',
    'ready':         'Ready',
    'working':       'Working…',
    'error':         'Error',
  };

  /** @param {string} status */
  function applyStatus(status) {
    const validStatuses = Object.keys(STATUS_LABELS);
    if (!validStatuses.includes(status)) { return; }

    statusBadge.className = 'fp-status fp-status--' + status;
    statusBadge.textContent = STATUS_LABELS[status] || status;

    isWorking = status === 'working' || status === 'connecting';
    btnCancel.hidden = status !== 'working';
    updateSendButton();

    if (status === 'working') {
      appendLoadingIndicator();
    } else {
      removeLoadingIndicator();
    }
  }

  // ── Send message ──────────────────────────────────────────────────────────

  function sendMessage() {
    const text = messageInput.value.trim();
    if (!conversationId || !text || isWorking) { return; }

    vscode.postMessage({
      type: 'SEND_MESSAGE',
      payload: {
        message: text,
        conversationId,
        mode: agentMode ? 'agent' : 'chat',
      },
    });

    messageInput.value = '';
    messageInput.style.height = 'auto';
    updateSendButton();
  }

  // ── Event listeners ───────────────────────────────────────────────────────

  messageInput.addEventListener('input', () => {
    updateSendButton();
    autoResizeTextarea();
  });

  messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  btnSend.addEventListener('click', () => sendMessage());
  btnCancel.addEventListener('click', () => {
    vscode.postMessage({ type: 'CANCEL_REQUEST' });
  });

  btnNewChat.addEventListener('click', () => {
    vscode.postMessage({ type: 'NEW_CHAT' });
  });

  agentToggle.addEventListener('change', () => {
    agentMode = agentToggle.checked;
    modeLabel.textContent = 'Mode: ' + (agentMode ? 'Agent' : 'Chat');
    document.body.classList.toggle('fp-agent-mode', agentMode);
    vscode.postMessage({
      type: 'AGENT_MODE_CHANGED',
      payload: { enabled: agentMode },
    });
  });

  btnInlineEdit.addEventListener('click', () => {
    inlinePanel.classList.remove('fp-hidden');
    inlineInstruction.focus();
    vscode.postMessage({ type: 'INLINE_CONTEXT_REQUEST' });
  });

  [btnInlineCancel, btnInlineCancel2].forEach((btn) => {
    btn.addEventListener('click', () => {
      inlinePanel.classList.add('fp-hidden');
      inlineInstruction.value = '';
    });
  });

  btnInlineSubmit.addEventListener('click', () => {
    const instruction = inlineInstruction.value.trim();
    if (!instruction) { return; }
    vscode.postMessage({
      type: 'INLINE_EDIT_REQUEST',
      payload: { instruction },
    });
    inlineInstruction.value = '';
    inlinePanel.classList.add('fp-hidden');
  });

  // ── Messages from Extension Host ──────────────────────────────────────────

  window.addEventListener('message', (event) => {
    const msg = event.data;
    if (!msg || typeof msg.type !== 'string') { return; }

    switch (msg.type) {
      case 'MESSAGE_RECEIVED': {
        if (msg.payload && typeof msg.payload === 'object') {
          const { role, content, messageId } = msg.payload;
          if (
            (role === 'user' || role === 'assistant') &&
            typeof content === 'string' &&
            typeof messageId === 'string'
          ) {
            appendMessage(role, content, messageId);
          }
        }
        break;
      }
      case 'MESSAGE_DELTA': {
        const bubble = msg.payload && typeof msg.payload === 'object'
          ? messagesById.get(msg.payload.messageId)
          : undefined;
        if (bubble && typeof msg.payload.delta === 'string') {
          bubble.textContent += msg.payload.delta;
          scrollToBottom();
        }
        break;
      }
      case 'INLINE_CONTEXT': {
        const selectedCode = msg.payload.selectedCode;
        inlineCodePreview.textContent = selectedCode
          ? selectedCode
          : 'No code selected — select code in the editor first.';
        break;
      }
      case 'STATUS_UPDATE': {
        applyStatus(msg.payload.status);
        break;
      }
      case 'ERROR': {
        removeLoadingIndicator();
        isWorking = false;
        btnCancel.hidden = true;
        updateSendButton();
        appendError(msg.payload.message);
        break;
      }
      case 'CHAT_CLEARED': {
        // Remove all messages except the empty-state placeholder
        const msgs = conversation.querySelectorAll('.fp-message, .fp-error-msg, .fp-loading');
        msgs.forEach((el) => el.remove());
        messagesById.clear();
        removeLoadingIndicator();
        if (typeof msg.payload.newConversationId === 'string') {
          conversationId = msg.payload.newConversationId;
        }
        if (typeof msg.payload.mode === 'string') {
          agentMode = msg.payload.mode === 'agent';
          agentToggle.checked = agentMode;
          modeLabel.textContent = 'Mode: ' + (agentMode ? 'Agent' : 'Chat');
          document.body.classList.toggle('fp-agent-mode', agentMode);
        }
        if (Array.isArray(msg.payload.messages) && msg.payload.messages.length > 0) {
          msg.payload.messages.forEach((message) => {
            if (
              message &&
              (message.role === 'user' || message.role === 'assistant') &&
              typeof message.content === 'string' &&
              typeof message.id === 'string'
            ) {
              appendMessage(message.role, message.content, message.id);
            }
          });
        } else {
          showEmptyState();
        }
        isWorking = false;
        btnCancel.hidden = true;
        updateSendButton();
        if (typeof msg.payload.status === 'string') {
          applyStatus(msg.payload.status);
        }
        break;
      }
    }
  });

  // ── Init ──────────────────────────────────────────────────────────────────

  // Tell the extension host the webview is ready
  vscode.postMessage({ type: 'WEBVIEW_READY' });
  updateSendButton();

})();
