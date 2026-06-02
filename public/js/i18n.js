// ============================================================
// Tuxruku ASA Manager - TRANSLATION ENGINE (i18n)
// ============================================================

let currentLang = localStorage.getItem('asa_lang') || 'en';
let t = {}; // Global dictionary object

// Fetch translation dictionary from backend
async function initTranslation() {
    try {
        const res = await fetch(`/api/config?lang=${currentLang}`);
        const data = await res.json();
        t = data.translation;
        applyTranslationsToDOM();
    } catch (e) {
        console.error("Failed to load language files", e);
    }
}

// Update all HTML elements containing the data-i18n attribute
function applyTranslationsToDOM() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (t[key]) {
            el.innerHTML = t[key];
        }
    });
}

// Switch language and reload the page
function setLanguage(lang) {
    localStorage.setItem('asa_lang', lang);
    location.reload();
}