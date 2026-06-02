// ============================================================
// Tuxruku ASA Manager - DYNAMIC SETTINGS UI
// ============================================================

const urlParams = new URLSearchParams(window.location.search);
const serverId = urlParams.get('id');

let settingsSchema = null;
let settingsData = {};
let currentCategory = null;
let globalModNames = {}; // Tracks mod names for display

window.onload = async () => {
    if (typeof initTranslation === 'function') await initTranslation();
    await loadSchema();
    await loadSettings();
    await loadRawSettings();
    initializeSearch();
};

// ============================================================
// RAW INI EDITOR
// ============================================================

async function loadRawSettings() {
    if (!serverId) return;
    try {
        const res = await fetch(`/api/instances/${serverId}/settings/raw`);
        const data = await res.json();
        if (data.success) {
            document.getElementById('raw-gus').value = data.gus;
            document.getElementById('raw-game').value = data.game;
        }
    } catch (e) {
        console.error("Failed to load RAW INI:", e);
    }
}

async function saveRawSettings() {
    const gus = document.getElementById('raw-gus').value;
    const game = document.getElementById('raw-game').value;

    try {
        const res = await fetch(`/api/instances/${serverId}/settings/raw`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ gus, game })
        });
        const data = await res.json();

        const statusLabel = document.getElementById('raw-save-status');
        statusLabel.classList.remove('hidden');

        if (data.success) {
            statusLabel.className = 'ml-4 text-sm font-bold text-emerald-400';
            statusLabel.innerText = "✓ " + data.message;
        } else {
            statusLabel.className = 'ml-4 text-sm font-bold text-red-400';
            statusLabel.innerText = "✗ " + (t.settings_error || "Error") + ": " + data.message;
        }
        setTimeout(() => statusLabel.classList.add('hidden'), 4000);
    } catch (e) {
        alert(t.settings_error_network || "Network error while saving INI.");
    }
}

// ============================================================
// LOAD SETTINGS SCHEMA
// ============================================================

async function loadSchema() {
    try {
        const response = await fetch('/api/settings/schema');
        const raw = await response.json();
        settingsSchema = raw.schema || raw;

        if (!settingsSchema.categories) throw new Error('categories missing in schema');

        // Inject Mod Manager Tab dynamically
        settingsSchema.categories.push({
            id: "mods",
            title: t.settings_tab_mod_manager || "Mod Manager",
            icon: "fa-cubes",
            description: t.settings_tab_mod_desc || "Search and install CurseForge mods directly.",
            settings: []
        });

        buildCategoryTabs();
        updateStatistics();
    } catch (err) {
        console.error('Failed loading schema:', err);
        showNotification(t.settings_error_schema || 'Failed loading settings schema', 'error');
    }
}

// ============================================================
// LOAD SERVER SETTINGS
// ============================================================

async function loadSettings() {
    try {
        const response = await fetch(`/api/instances/${serverId}/settings`);
        const data = await response.json();

        if (!data.success) {
            showNotification(data.message || t.settings_error_load || 'Failed loading settings', 'error');
            return;
        }

        settingsData = data.settings || {};
        document.getElementById('server-name').innerText = settingsData.SessionName || (t.settings_unknown_server || 'Unknown Server');

        if (!currentCategory && settingsSchema.categories.length > 0) {
            currentCategory = settingsSchema.categories[0].id;
        }

        await loadModNames();
        renderCurrentCategory();
    } catch (err) {
        console.error(err);
        showNotification(t.settings_error_load || 'Failed loading settings', 'error');
    }
}

// ============================================================
// BUILD CATEGORY TABS
// ============================================================

function buildCategoryTabs() {
    const container = document.getElementById('category-tabs');
    container.innerHTML = '';

    settingsSchema.categories.forEach(category => {
        const button = document.createElement('button');
        button.id = `tab-${category.id}`;
        button.className = 'tab-inactive px-5 py-3 rounded-xl font-bold whitespace-nowrap transition';
        // Schema titles are handled by the backend schema, unless overridden
        const catTitle = (category.i18n_title && t[category.i18n_title]) ? t[category.i18n_title] : category.title;
        button.innerHTML = `<i class="fa ${category.icon || 'fa-sliders'} mr-2"></i>${catTitle}`;

        button.onclick = () => {
            currentCategory = category.id;
            renderCurrentCategory();
        };

        container.appendChild(button);
    });
}

// ============================================================
// RENDER CURRENT CATEGORY
// ============================================================

function renderCurrentCategory() {
    document.querySelectorAll('#category-tabs button').forEach(btn => {
        btn.classList.remove('tab-active');
        btn.classList.add('tab-inactive');
    });

    const activeBtn = document.getElementById(`tab-${currentCategory}`);
    if (activeBtn) {
        activeBtn.classList.remove('tab-inactive');
        activeBtn.classList.add('tab-active');
    }

    const category = settingsSchema.categories.find(c => c.id === currentCategory);
    if (!category) return;

    const container = document.getElementById('settings-container');
    container.innerHTML = '';

    if (category.id === 'mods') {
        renderModManagerTab(container, category);
        return;
    }

    const lblSettings = t.settings_lbl_settings || "Settings";

    const section = document.createElement('div');
    section.className = 'space-y-6';
    section.innerHTML = `
        <div class="setting-card">
            <div class="flex items-center justify-between">
                <div>
                    <h2 class="text-2xl font-black text-white">${category.title}</h2>
                    <p class="text-slate-400 mt-1">${category.description || ''}</p>
                </div>
                <div class="text-right">
                    <div class="text-xs uppercase tracking-wider text-slate-500 font-bold">${lblSettings}</div>
                    <div class="text-3xl font-black text-cyan-400">${category.settings.length}</div>
                </div>
            </div>
        </div>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
            ${category.settings.map(renderSettingCard).join('')}
        </div>
    `;
    container.appendChild(section);
}

// ============================================================
// RENDER SETTING CARD
// ============================================================

function renderSettingCard(setting) {
    const value = settingsData[setting.key] ?? setting.default;

    if (setting.type === 'checkbox') {
        return `
            <label class="setting-card flex items-center justify-between cursor-pointer">
                <div>
                    <div class="font-bold text-white text-lg">${(setting.i18n_label && t[setting.i18n_label]) || setting.label || setting.key}</div>
                    <div class="text-sm text-slate-400 mt-1">${setting.description || ''}</div>
                    <div class="text-xs text-cyan-400 mt-2 font-mono">${setting.key}</div>
                </div>
                <input type="checkbox" ${value ? 'checked' : ''} onchange="updateSetting('${setting.key}', this.checked)" class="w-6 h-6 accent-cyan-500">
            </label>
        `;
    }

    if (setting.type === 'number') {
        return `
            <div class="setting-card">
                <div class="flex items-start justify-between gap-4 mb-4">
                    <div>
                        <div class="font-bold text-white text-lg">${(setting.i18n_label && t[setting.i18n_label]) || setting.label || setting.key}</div>
                        <div class="text-sm text-slate-400 mt-1">${setting.description || ''}</div>
                        <div class="text-xs text-cyan-400 mt-2 font-mono">${setting.key}</div>
                    </div>
                    <input id="num-${setting.key}" type="number" value="${value}" step="${setting.step || 1}" min="${setting.min ?? 0}" max="${setting.max ?? 999999}" oninput="syncNumberToSlider('${setting.key}', this.value)" class="w-28 bg-black border border-slate-700 rounded-lg px-3 py-2 text-cyan-400 font-mono text-center outline-none focus:border-cyan-500">
                </div>
                <input id="slider-${setting.key}" type="range" value="${value}" min="${setting.min ?? 0}" max="${setting.max ?? 999999}" step="${setting.step || 1}" oninput="syncSliderToNumber('${setting.key}', this.value)" class="w-full accent-cyan-500">
            </div>
        `;
    }

    if (setting.type === 'select') {
        return `
            <div class="setting-card">
                <div class="font-bold text-white text-lg">${(setting.i18n_label && t[setting.i18n_label]) || setting.label || setting.key}</div>
                <div class="text-sm text-slate-400 mt-1">${setting.description || ''}</div>
                <div class="text-xs text-cyan-400 mt-2 mb-4 font-mono">${setting.key}</div>
                <select onchange="updateSetting('${setting.key}', this.value)" class="w-full bg-black border border-slate-700 rounded-lg px-4 py-3 outline-none focus:border-cyan-500 text-white">
                    ${(setting.options || []).map(option => `<option value="${option.value}" ${option.value == value ? 'selected' : ''}>${option.label}</option>`).join('')}
                </select>
            </div>
        `;
    }

    return `
        <div class="setting-card">
            <div class="font-bold text-white text-lg">${(setting.i18n_label && t[setting.i18n_label]) || setting.label || setting.key}</div>
            <div class="text-sm text-slate-400 mt-1">${setting.description || ''}</div>
            <div class="text-xs text-cyan-400 mt-2 mb-4 font-mono">${setting.key}</div>
            <input type="text" value="${value}" onchange="updateSetting('${setting.key}', this.value)" class="w-full bg-black border border-slate-700 rounded-lg px-4 py-3 outline-none focus:border-cyan-500 text-white">
        </div>
    `;
}

// ============================================================
// SYNCING (TWO-WAY)
// ============================================================

function syncSliderToNumber(key, value) {
    settingsData[key] = parseFloat(value);
    const numInput = document.getElementById(`num-${key}`);
    if (numInput) numInput.value = value;
    setSaveState('modified');
}

function syncNumberToSlider(key, value) {
    settingsData[key] = parseFloat(value);
    const sliderInput = document.getElementById(`slider-${key}`);
    if (sliderInput) sliderInput.value = value;
    setSaveState('modified');
}

function updateSetting(key, value) {
    settingsData[key] = value;
    setSaveState('modified');
}

// ============================================================
// SAVE & RELOAD
// ============================================================

async function saveSettings() {
    try {
        setSaveState('saving');
        const response = await fetch(`/api/instances/${serverId}/settings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settingsData)
        });

        const data = await response.json();
        if (!data.success) {
            showNotification(data.message || t.settings_error_save || 'Failed saving settings', 'error');
            setSaveState('error');
            return;
        }

        setSaveState('saved');
        showNotification(t.settings_success_save || 'Settings saved successfully', 'success');
    } catch (err) {
        console.error(err);
        showNotification(t.settings_error_save || 'Failed saving settings', 'error');
        setSaveState('error');
    }
}

async function reloadSettings() {
    showNotification(t.settings_reloading || 'Reloading settings...', 'info');
    await loadSettings();
}

// ============================================================
// UTILS & NOTIFICATIONS
// ============================================================

function updateStatistics() {
    document.getElementById('category-count').innerText = settingsSchema.categories.length;
    let totalSettings = 0;
    settingsSchema.categories.forEach(cat => { totalSettings += (cat.settings ? cat.settings.length : 0); });
    document.getElementById('setting-count').innerText = totalSettings;
}

function setSaveState(state) {
    const el = document.getElementById('save-status');
    if (!el) return;
    switch (state) {
        case 'modified':
            el.innerText = t.settings_state_modified || 'Modified';
            el.className = 'text-xl font-bold text-yellow-400';
            break;
        case 'saving':
            el.innerText = t.settings_state_saving || 'Saving...';
            el.className = 'text-xl font-bold text-cyan-400';
            break;
        case 'saved':
            el.innerText = t.settings_state_saved || 'Saved';
            el.className = 'text-xl font-bold text-emerald-400';
            break;
        case 'error':
            el.innerText = t.settings_error || 'Error';
            el.className = 'text-xl font-bold text-red-400';
            break;
    }
}

function showNotification(message, type = 'info') {
    const existing = document.getElementById('floating-notification');
    if (existing) existing.remove();

    const notification = document.createElement('div');
    notification.id = 'floating-notification';
    let bg = 'bg-cyan-600';
    if (type === 'success') bg = 'bg-emerald-600';
    if (type === 'error') bg = 'bg-red-600';
    if (type === 'warning') bg = 'bg-yellow-600';

    notification.className = `fixed top-5 right-5 z-50 ${bg} px-6 py-4 rounded-xl shadow-2xl text-white font-bold animate-pulse`;
    notification.innerHTML = `<div class="flex items-center gap-3"><i class="fa fa-circle-info"></i><span>${message}</span></div>`;
    document.body.appendChild(notification);
    setTimeout(() => { notification.remove(); }, 3500);
}

// ============================================================
// SEARCH SYSTEM
// ============================================================

function initializeSearch() {
    const search = document.getElementById('settings-search');
    if(!search) return;

    search.addEventListener('input', e => {
        const query = e.target.value.toLowerCase().trim();
        if (!query) {
            renderCurrentCategory();
            return;
        }

        const matches = [];
        settingsSchema.categories.forEach(category => {
            if(!category.settings) return;
            category.settings.forEach(setting => {
                const text = `${setting.key} ${setting.label || ''} ${setting.description || ''}`.toLowerCase();
                if (text.includes(query)) matches.push(setting);
            });
        });

        renderSearchResults(matches, query);
    });
}

function renderSearchResults(matches, query) {
    const container = document.getElementById('settings-container');
    const titleTxt = t.settings_search_results || "Search Results";
    const matchTxt = t.settings_search_matches || "matching settings for";

    container.innerHTML = `
        <div class="setting-card mb-4">
            <div class="text-2xl font-black text-white">${titleTxt}</div>
            <div class="text-slate-400 mt-1">${matches.length} ${matchTxt} "${query}"</div>
        </div>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
            ${matches.map(renderSettingCard).join('')}
        </div>
    `;
}

function expandAll() { showNotification('Advanced grouping system coming soon', 'info'); }
function collapseAll() { showNotification('Advanced grouping system coming soon', 'info'); }


// ============================================================
// MOD MANAGER
// ============================================================

function renderModManagerTab(container, category) {
    const lblSearchDb = t.settings_mod_search_db || "Search Database";
    const lblPlaceholder = t.settings_mod_placeholder || "Type mod name or ID...";
    const lblSearchBtn = t.settings_mod_search_btn || "Search";
    const lblInstalled = t.settings_mod_installed || "Installed Mods";

    container.innerHTML = `
        <div class="setting-card mb-6">
            <div class="flex items-center justify-between">
                <div>
                    <h2 class="text-2xl font-black text-white">${category.title}</h2>
                    <p class="text-slate-400 mt-1">${category.description}</p>
                </div>
                <div class="text-5xl text-cyan-500"><i class="fa ${category.icon}"></i></div>
            </div>
        </div>
        <div class="space-y-6">
            <div class="setting-card">
                <label class="font-bold text-cyan-400 uppercase tracking-wider text-sm"><i class="fa fa-database mr-2"></i>${lblSearchDb}</label>
                <div class="flex gap-2 mt-3">
                    <input id="mod-search-input" type="text" placeholder="${lblPlaceholder}" onkeypress="if(event.key === 'Enter') searchCurseForgeMods()" class="flex-1 bg-black border border-slate-700 text-white px-4 py-3 rounded-xl outline-none focus:border-cyan-500">
                    <button onclick="searchCurseForgeMods()" class="bg-cyan-600 hover:bg-cyan-500 px-6 rounded-xl font-bold transition text-white shadow-lg"><i class="fa fa-search mr-2"></i>${lblSearchBtn}</button>
                </div>
                <div id="mod-search-results" class="grid gap-2 max-h-[300px] overflow-y-auto pt-4"></div>
            </div>
            <div class="setting-card">
                <label class="font-bold text-cyan-400 uppercase tracking-wider text-sm"><i class="fa fa-list mr-2"></i>${lblInstalled}</label>
                <div id="visual-mod-list" class="space-y-2 mt-3"></div>
            </div>
        </div>
    `;
    renderVisualModList();
}

async function loadModNames() {
    const modIds = settingsData.mods || "";
    if (!modIds) return;
    try {
        const nameRes = await fetch(`/api/mods/names?ids=${encodeURIComponent(modIds)}`);
        const nameData = await nameRes.json();
        if (nameData.success) Object.assign(globalModNames, nameData.names);
    } catch(e) { console.error("Could not fetch mod names", e); }
}

async function searchCurseForgeMods() {
    const query = document.getElementById('mod-search-input').value.trim();
    const resultsDiv = document.getElementById('mod-search-results');
    if (!query) return;

    const loadingTxt = t.settings_mod_searching || "Searching database via proxy...";
    resultsDiv.innerHTML = `<div class="text-xs text-slate-400 p-2"><i class="fa fa-spinner fa-spin mr-2 text-cyan-500"></i> ${loadingTxt}</div>`;

    try {
        const res = await fetch(`/api/mods/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();

        if (data.success && data.mods.length > 0) {
            const addTxt = t.settings_mod_btn_add || "Add";
            const byTxt = t.settings_mod_by || "by";

            resultsDiv.innerHTML = data.mods.map(m => `
                <div class="flex items-center justify-between bg-black/40 p-3 rounded-lg border border-slate-700 text-xs shadow-inner">
                    <div class="flex items-center gap-3">
                        <img src="${m.thumbnail}" class="w-10 h-10 rounded border border-slate-600 object-cover shadow">
                        <div>
                            <h4 class="font-bold text-white">${m.name} <span class="text-slate-500 font-normal">${byTxt} ${m.author}</span></h4>
                            <p class="text-slate-400 text-[11px] max-w-md truncate">${m.summary}</p>
                            <p class="text-cyan-400 font-mono text-[10px] mt-0.5">ID: ${m.id}</p>
                        </div>
                    </div>
                    <button onclick="quickAddModId('${m.id}', '${m.name.replace(/'/g, "\\'")}')" class="bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-3 py-1.5 rounded transition shadow">
                        <i class="fa fa-plus"></i> ${addTxt}
                    </button>
                </div>
            `).join('');
        } else {
            const noneFound = t.settings_mod_none_found || "No mods found.";
            resultsDiv.innerHTML = `<div class="text-xs text-yellow-500 p-2">${noneFound}</div>`;
        }
    } catch (err) {
        const errTxt = t.settings_mod_search_err || "Error connecting to search.";
        resultsDiv.innerHTML = `<div class="text-xs text-red-500 p-2">${errTxt}</div>`;
    }
}

async function quickAddModId(id, name) {
    if (!id) return;
    let modsStr = settingsData.mods || "";
    let modArray = modsStr.trim() ? modsStr.split(',').map(x => x.trim()).filter(x => x !== "") : [];

    if (modArray.includes(id.toString())) {
        showNotification(t.settings_mod_already_active || "Mod already active!", "warning");
        return;
    }

    globalModNames[id] = name || `Unknown Mod (${id})`;
    if (name) {
        fetch('/api/mods/names', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: id, name: name }) }).catch(e => {});
    }

    modArray.push(id);
    updateSetting('mods', modArray.join(','));
    renderVisualModList();

    document.getElementById('mod-search-input').value = '';
    const addedTxt = t.settings_mod_added || "Mod added!";
    document.getElementById('mod-search-results').innerHTML = `<div class="text-xs text-emerald-400 p-2 font-bold"><i class="fa fa-check mr-1"></i> ${addedTxt}</div>`;
}

function removeModId(id) {
    let modsStr = settingsData.mods || "";
    let modArray = modsStr.split(',').map(x => x.trim()).filter(x => x !== "");
    modArray = modArray.filter(x => x !== id.toString());
    updateSetting('mods', modArray.join(','));
    renderVisualModList();
}

function renderVisualModList() {
    const listDiv = document.getElementById('visual-mod-list');
    if (!listDiv) return;

    let modsStr = settingsData.mods || "";
    const modArray = modsStr.split(',').map(x => x.trim()).filter(x => x !== "");

    if (modArray.length === 0) {
        const emptyTxt = t.settings_mod_empty || "No mods installed.";
        listDiv.innerHTML = `<p class="text-xs text-slate-500 italic p-2">${emptyTxt}</p>`;
        return;
    }

    const removeTxt = t.settings_mod_btn_remove || "Remove";
    const loadingTxt = t.settings_mod_loading || "Loading...";

    listDiv.innerHTML = modArray.map(id => `
        <div class="flex justify-between items-center bg-black/40 p-3 px-4 rounded-lg border border-slate-700/60 font-mono text-xs shadow-inner">
            <span class="text-cyan-300 flex items-center gap-2">
                <i class="fa fa-cube text-cyan-500 text-base"></i> 
                <strong class="text-white font-sans text-sm">${globalModNames[id] || `${loadingTxt} (ID: ${id})`}</strong>
            </span>
            <button onclick="removeModId(${id})" class="text-red-400 hover:text-red-500 p-1.5 px-3 hover:bg-red-500/10 rounded transition font-sans font-bold">
                <i class="fa fa-trash-can mr-1"></i> ${removeTxt}
            </button>
        </div>
    `).join('');
}