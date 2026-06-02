// ============================================================
// Tuxruku ASA Manager - SETTINGS MANAGER
// ============================================================

const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

// ============================================================
// FILE PATHS
// ============================================================
const INSTANCES_FILE = path.join(__dirname, '..', 'data', 'instances.json');
const settingsSchema = require('../config/settings-schema');

// ============================================================
// HELPERS
// ============================================================
function loadInstances() {
    if (!fs.existsSync(INSTANCES_FILE)) return [];
    return JSON.parse(fs.readFileSync(INSTANCES_FILE, 'utf8'));
}

function saveInstances(instances) {
    fs.writeFileSync(INSTANCES_FILE, JSON.stringify(instances, null, 2));
}

// ============================================================
// GET SETTINGS SCHEMA
// ============================================================
router.get('/settings/schema', (req, res) => {
    try {
        res.json(settingsSchema);
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// ============================================================
// INI HELPERS FOR SMART PARSING (TWO-WAY SYNC)
// ============================================================
function getIniValue(content, key) {
    const match = content.match(new RegExp(`^${key}=(.*)$`, 'm'));
    return match ? match[1].trim() : null;
}

function setIniValue(content, section, key, value) {
    const exactRegex = new RegExp(`^${key}=.*$`, 'm');
    if (exactRegex.test(content)) {
        return content.replace(exactRegex, `${key}=${value}`);
    }
    const sectionRegex = new RegExp(`^(\\[${section}\\])`, 'm');
    if (sectionRegex.test(content)) {
        return content.replace(sectionRegex, `$1\n${key}=${value}`);
    }
    return content + `\n[${section}]\n${key}=${value}\n`;
}

// ============================================================
// GET INSTANCE SETTINGS (SMART READ)
// ============================================================
router.get('/instances/:id/settings', (req, res) => {
    try {
        const instances = loadInstances();
        const instance = instances.find(i => i.id == req.params.id);

        if (!instance) return res.status(404).json({ success: false, message: 'Instance not found' });

        const settings = {};

        let gusContent = "";
        let gameContent = "";
        if (instance.path) {
            const gusPath = path.join(instance.path, 'ShooterGame', 'Saved', 'Config', 'WindowsServer', 'GameUserSettings.ini');
            const gamePath = path.join(instance.path, 'ShooterGame', 'Saved', 'Config', 'WindowsServer', 'Game.ini');
            if (fs.existsSync(gusPath)) gusContent = fs.readFileSync(gusPath, 'utf8');
            if (fs.existsSync(gamePath)) gameContent = fs.readFileSync(gamePath, 'utf8');
        }

        settingsSchema.categories.forEach(category => {
            category.settings.forEach(setting => {
                let val = null;

                if (setting.ini === 'GameUserSettings' && gusContent) {
                    val = getIniValue(gusContent, setting.key);
                } else if (setting.ini === 'Game' && gameContent) {
                    val = getIniValue(gameContent, setting.key);
                }

                if (val === null) {
                    val = instance.settings?.[setting.key] ?? setting.default;
                } else {
                    if (val.toLowerCase() === 'true') val = true;
                    else if (val.toLowerCase() === 'false') val = false;
                    // Check that the value actually contains text BEFORE converting to a number
                    else if (val.trim() !== "" && !isNaN(val)) val = Number(val);
                }

                settings[setting.key] = val;
            });
        });

        settings.mods = instance.settings?.mods ?? "";
        res.json({ success: true, settings });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// ============================================================
// SAVE INSTANCE SETTINGS (SMART WRITE)
// ============================================================
router.post('/instances/:id/settings', (req, res) => {
    try {
        const instances = loadInstances();
        const instance = instances.find(i => i.id == req.params.id);

        if (!instance) return res.status(404).json({ success: false, message: 'Instance not found' });
        if (!instance.settings) instance.settings = {};

        Object.keys(req.body).forEach(key => { instance.settings[key] = req.body[key]; });
        saveInstances(instances);

        if (instance.path) {
            const configDir = path.join(instance.path, 'ShooterGame', 'Saved', 'Config', 'WindowsServer');
            const gusPath = path.join(configDir, 'GameUserSettings.ini');
            const gameIniPath = path.join(configDir, 'Game.ini');

            if (!fs.existsSync(configDir)) fs.mkdirSync(configDir, { recursive: true });

            let gusContent = fs.existsSync(gusPath) ? fs.readFileSync(gusPath, 'utf8') : "[ServerSettings]\n";
            let gameContent = fs.existsSync(gameIniPath) ? fs.readFileSync(gameIniPath, 'utf8') : "[/Script/ShooterGame.ShooterGameMode]\n";

            settingsSchema.categories.forEach(category => {
                if(!category.settings) return;
                category.settings.forEach(setting => {
                    let val = instance.settings[setting.key] ?? setting.default;
                    let strVal = "";

                    // Handle booleans (checkboxes)
                    if (typeof val === 'boolean') {
                        strVal = val ? 'True' : 'False';
                    }
                    // SECURITY: Force empty fields AND "0" passwords to be completely blank
                    else if (val === "" || val === null || (setting.key === 'ServerPassword' && String(val) === "0")) {
                        strVal = "";
                    }
                    // Convert everything else to a safe string for the INI file
                    else {
                        strVal = String(val);
                    }

                    // Always write the line to the INI file. If strVal is empty, it writes "Key="
                    if (setting.ini === 'GameUserSettings') {
                        gusContent = setIniValue(gusContent, 'ServerSettings', setting.key, strVal);
                    } else if (setting.ini === 'Game') {
                        gameContent = setIniValue(gameContent, '/Script/ShooterGame.ShooterGameMode', setting.key, strVal);
                    }
                });
            });

            gusContent = setIniValue(gusContent, 'Internationalization', 'Culture', 'en');

            fs.writeFileSync(gusPath, gusContent);
            fs.writeFileSync(gameIniPath, gameContent);
        }

        res.json({ success: true, message: "Settings saved to INI files successfully!" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// ============================================================
// RESET SETTINGS TO DEFAULT
// ============================================================
router.post('/instances/:id/settings/reset', (req, res) => {
    try {
        const instances = loadInstances();
        const instance = instances.find(i => i.id == req.params.id);

        if (!instance) {
            return res.status(404).json({ success: false, message: 'Instance not found' });
        }

        instance.settings = {};
        saveInstances(instances);

        res.json({ success: true, message: "Settings reset to default in database. Please save settings to update INI." });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// ============================================================
// RAW INI EDITOR (MANUAL EDITING)
// ============================================================

router.get('/instances/:id/settings/raw', (req, res) => {
    try {
        const instances = loadInstances();
        const instance = instances.find(i => i.id == req.params.id);
        if (!instance) return res.status(404).json({ success: false, message: 'Instance not found' });

        const gusPath = path.join(instance.path, 'ShooterGame', 'Saved', 'Config', 'WindowsServer', 'GameUserSettings.ini');
        const gameIniPath = path.join(instance.path, 'ShooterGame', 'Saved', 'Config', 'WindowsServer', 'Game.ini');

        const gusContent = fs.existsSync(gusPath) ? fs.readFileSync(gusPath, 'utf8') : '';
        const gameContent = fs.existsSync(gameIniPath) ? fs.readFileSync(gameIniPath, 'utf8') : '';

        res.json({ success: true, gus: gusContent, game: gameContent });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

router.post('/instances/:id/settings/raw', (req, res) => {
    try {
        const instances = loadInstances();
        const instance = instances.find(i => i.id == req.params.id);
        if (!instance) return res.status(404).json({ success: false, message: 'Instance not found' });

        const { gus, game } = req.body;
        const configDir = path.join(instance.path, 'ShooterGame', 'Saved', 'Config', 'WindowsServer');

        if (!fs.existsSync(configDir)) fs.mkdirSync(configDir, { recursive: true });

        fs.writeFileSync(path.join(configDir, 'GameUserSettings.ini'), gus);
        fs.writeFileSync(path.join(configDir, 'Game.ini'), game);

        res.json({ success: true, message: "Raw INI files saved successfully!" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;