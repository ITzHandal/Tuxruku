// ============================================================
// Tuxruku ASA Manager - RCON FRONTEND UI
// ============================================================

const urlParams = new URLSearchParams(window.location.search);
const serverId = urlParams.get('id');
let rconSchema = null;
let playerPollInterval = null;

// Log System State
let allLogLines = [];
let currentFilter = 'all';
const socket = io();

window.onload = async () => {
    // Wait for the translation engine to load dictionaries first
    if (typeof initTranslation === 'function') await initTranslation();

    if (!serverId) {
        document.body.innerHTML = `<h1 class='text-white p-10'>${t.rcon_error_no_id || 'Error: No Server ID provided.'}</h1>`;
        return;
    }

    await loadSchema();
    fetchPlayers();
    playerPollInterval = setInterval(fetchPlayers, 10000);

    // Fetch historical logs
    await fetchLogHistory();

    // Listen to live WebSocket stream
    socket.on(`console-${serverId}`, (data) => {
        const lines = data.split('\n');
        lines.forEach(line => {
            if (line.trim()) processLogLine(line.trim());
        });
    });
};

// ============================================================
// 1. LOG SYSTEM & PARSING
// ============================================================
async function fetchLogHistory() {
    try {
        const res = await fetch(`/api/instances/${serverId}/rcon/log`);
        const data = await res.json();
        if (data.success && data.logs) {
            document.getElementById('live-console-output').innerHTML = '';
            data.logs.forEach(line => processLogLine(line));
        }
    } catch(e) {
        console.error("Failed to fetch log history");
    }
}

function processLogLine(rawText) {
    let type = 'system';
    let htmlLine = rawText;
    const lower = rawText.toLowerCase();

    // 1. Filter out system noise
    const isSystemLog = rawText.includes('LogSentrySdk:') ||
        rawText.includes('LogCFCore:') ||
        rawText.includes('LogMemory:') ||
        rawText.includes('Attempted GC') ||
        rawText.includes('PassiveProduction') ||
        rawText.includes('Server: "');

    // 2. Parse ASA Events
    if (lower.includes('was killed') || lower.includes('died')) {
        type = 'kill';
        htmlLine = `<span class="text-red-400 font-bold">☠️ ${rawText}</span>`;
    }
    else if (lower.includes('tamed ') || lower.includes('tamed!')) {
        type = 'tame';
        htmlLine = `<span class="text-emerald-400 font-bold">🦕 ${rawText}</span>`;
    }
    else if (lower.includes('joined this ark') || lower.includes('left this ark')) {
        type = 'join';
        htmlLine = `<span class="text-yellow-400 font-bold">🚪 ${rawText}</span>`;
    }
    else if (rawText.startsWith('>')) {
        type = 'rcon';
        htmlLine = `<span class="text-indigo-400 font-bold">${rawText}</span>`;
    }
    else if (!isSystemLog && (rawText.includes('SERVER: ') || rawText.includes('): ') || lower.includes('admincmd:'))) {
        type = 'chat';
        htmlLine = `<span class="text-cyan-300">💬 ${rawText}</span>`;
    }
    else {
        type = 'system';
        htmlLine = `<span class="text-slate-500">${rawText}</span>`;
    }

    // 3. Store and render
    allLogLines.push({ type, html: htmlLine, raw: rawText });
    if (allLogLines.length > 1000) allLogLines.shift();

    renderLogs();
}

function setLogFilter(filterType) {
    currentFilter = filterType;

    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active', 'bg-slate-700', 'text-white');
        btn.classList.add('text-slate-400');
    });

    const activeBtn = document.getElementById(`filter-${filterType}`);
    if (activeBtn) {
        activeBtn.classList.add('active', 'bg-slate-700', 'text-white');
        activeBtn.classList.remove('text-slate-400');
    }

    renderLogs();
}

function renderLogs() {
    const consoleDiv = document.getElementById('live-console-output');

    const filtered = allLogLines.filter(log => {
        if (currentFilter === 'all') return true;
        if (currentFilter === 'chat' && (log.type === 'chat' || log.type === 'rcon')) return true;
        return log.type === currentFilter;
    });

    consoleDiv.innerHTML = filtered.map(log => `<div>${log.html}</div>`).join('');
    consoleDiv.scrollTop = consoleDiv.scrollHeight;
}

// ============================================================
// 2. SCHEMA & QUICK ACTIONS
// ============================================================
async function loadSchema() {
    try {
        const res = await fetch(`/api/instances/${serverId}/rcon/schema`);
        const data = await res.json();
        if (data.success) {
            rconSchema = data.schema;
            renderQuickActions();
            renderChatTypes();
        }
    } catch (e) {
        console.error("Failed to load schema", e);
    }
}

function renderQuickActions() {
    const grid = document.getElementById('quick-action-grid');
    if (!rconSchema) return;

    grid.innerHTML = rconSchema.quickCommands.map(cmd => {
        // Use i18n key if available, fallback to default label
        const displayLabel = (cmd.i18n && t[cmd.i18n]) ? t[cmd.i18n] : cmd.label;
        return `
            <button onclick="executeAction('${cmd.command}', ${cmd.timeout || 5000})" class="${cmd.color} hover:opacity-80 text-white font-bold py-2 px-2 rounded transition shadow flex items-center justify-center gap-2 text-xs">
                <i class="fa ${cmd.icon}"></i> ${displayLabel}
            </button>
        `;
    }).join('');
}

function renderChatTypes() {
    const select = document.getElementById('chat-type');
    select.innerHTML = rconSchema.chatTypes.map(cmd => {
        const displayLabel = (cmd.i18n && t[cmd.i18n]) ? t[cmd.i18n] : cmd.label;
        return `<option value="${cmd.id}">${displayLabel}</option>`;
    }).join('');
}

// ============================================================
// 3. COMMAND EXECUTION
// ============================================================
async function executeAction(command, timeout) {
    const execText = t.rcon_log_executing || "> Executing RCON:";
    processLogLine(`${execText} ${command}...`);

    try {
        const res = await fetch(`/api/instances/${serverId}/rcon/command`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ command, timeout })
        });
        const data = await res.json();

        if (data.success) {
            const resText = t.rcon_log_response || "> [SERVER RESPONSE]:";
            processLogLine(`${resText} ${data.response}`);
        } else {
            const errText = t.rcon_log_error || "> [ERROR]:";
            processLogLine(`${errText} ${data.message}`);
        }
    } catch (e) {
        const discText = t.rcon_log_disconnected || "> [ERROR]: Lost connection to server.";
        processLogLine(`${discText}`);
    }
}

function sendRawCommand() {
    const input = document.getElementById('raw-command-input');
    const command = input.value.trim();
    if (!command) return;
    input.value = '';
    executeAction(command, 15000);
}

// ============================================================
// 4. COMM-LINK & PLAYERS
// ============================================================
async function sendChat() {
    const type = document.getElementById('chat-type').value;
    const sender = document.getElementById('chat-sender').value.trim();
    const input = document.getElementById('chat-message');
    const message = input.value.trim();
    if (!message) return;

    try {
        const res = await fetch(`/api/instances/${serverId}/rcon/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type, message, sender })
        });
        if ((await res.json()).success) {
            const chatSentText = t.rcon_log_chat_sent || "> CHAT SENT";
            processLogLine(`${chatSentText} (${type}): ${message}`);
            input.value = '';
        }
    } catch (e) {}
}

async function fetchPlayers() {
    try {
        const res = await fetch(`/api/instances/${serverId}/rcon/players`);
        const data = await res.json();
        const tbody = document.getElementById('player-list-body');

        const noPlayersTxt = t.rcon_no_players || "No active players.";
        const kickTxt = t.rcon_btn_kick || "Kick";
        const banTxt = t.rcon_btn_ban || "Ban";

        if (!data.success || !data.players || data.players.length === 0) {
            tbody.innerHTML = `<tr><td colspan="3" class="p-4 text-center text-slate-500 italic">${noPlayersTxt}</td></tr>`;
            return;
        }

        tbody.innerHTML = data.players.map(p => `
            <tr class="hover:bg-slate-800/80 transition border-b border-slate-700/50">
                <td class="p-2 font-bold text-cyan-300 text-sm">${p.name}</td>
                <td class="p-2 font-mono text-slate-400 text-[10px]">${p.id}</td>
                <td class="p-2 text-right">
                    <button onclick="executeAction('kickplayer ${p.id}', 3000)" class="bg-orange-600 hover:bg-orange-500 text-white px-2 py-1 rounded text-xs font-bold transition">${kickTxt}</button>
                    <button onclick="executeAction('banplayer ${p.id}', 3000)" class="bg-red-600 hover:bg-red-500 text-white px-2 py-1 rounded text-xs font-bold transition ml-1">${banTxt}</button>
                </td>
            </tr>
        `).join('');
    } catch (e) {
        const offlineTxt = t.rcon_status_offline || "Offline";
        document.getElementById('player-list-body').innerHTML = `<tr><td colspan="3" class="p-4 text-center text-red-500 italic">${offlineTxt}</td></tr>`;
    }
}