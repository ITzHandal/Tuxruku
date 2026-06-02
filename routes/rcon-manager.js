// ============================================================
// Tuxruku ASA Manager - RCON MANAGER
// ============================================================

const express = require('express');
const fs = require('fs');
const path = require('path');
const { Rcon } = require('rcon-client');
const dotenv = require('dotenv');
const { exec } = require('child_process');

dotenv.config();
const router = express.Router();

const INSTANCES_FILE = path.join(__dirname, '..', 'data', 'instances.json');
const rconSchema = require('../config/rcon-schema');
const SERVER_IP = process.env.SERVER_IP || '127.0.0.1';
const LOCAL_IP = process.env.LOCAL_IP || '127.0.0.1';

// ============================================================
// HELPERS
// ============================================================

function getInstance(id) {
    if (!fs.existsSync(INSTANCES_FILE)) return null;
    return JSON.parse(fs.readFileSync(INSTANCES_FILE, 'utf8')).find(i => i.id === parseInt(id));
}

async function getRconConnection(instance, customTimeout = 5000) {
    const adminPass = instance.settings?.ServerAdminPassword || 'admin';

    const rcon = new Rcon({
        host: LOCAL_IP,
        port: parseInt(instance.port) + 10,
        password: adminPass,
        timeout: customTimeout
    });

    // Catch errors silently before connection to prevent unhandled rejections
    rcon.on('error', (err) => {});

    await rcon.connect();
    return rcon;
}

// ============================================================
// 1. GET RCON SCHEMA
// ============================================================

router.get('/instances/:id/rcon/schema', (req, res) => {
    res.json({ success: true, schema: rconSchema });
});

// ============================================================
// 2. EXECUTE RCON COMMAND
// ============================================================

router.post('/instances/:id/rcon/command', async (req, res) => {
    const instance = getInstance(req.params.id);
    if (!instance || instance.status !== 'Running') {
        return res.status(400).json({ success: false, message: 'Server is not running.' });
    }

    const { command, timeout } = req.body;
    try {
        const rcon = await getRconConnection(instance, timeout || 5000);
        const response = await rcon.send(command);
        rcon.end();

        const cleanResponse = response ? response.trim() : "Command executed (no response text from Ark).";
        res.json({ success: true, response: cleanResponse });
    } catch (err) {
        res.status(500).json({ success: false, message: `RCON Error: ${err.message}` });
    }
});

// ============================================================
// 3. GET PLAYER LIST
// ============================================================

router.get('/instances/:id/rcon/players', async (req, res) => {
    const instance = getInstance(req.params.id);
    if (!instance || instance.status !== 'Running') {
        return res.status(400).json({ success: false, players: [] });
    }

    try {
        const rcon = await getRconConnection(instance, 5000);
        const response = await rcon.send("listplayers");
        rcon.end();

        const players = [];
        if (response && !response.toLowerCase().includes('no players')) {
            const lines = response.split('\n');
            lines.forEach(line => {
                const cleanLine = line.trim();
                // Regex matches Ark's player output format
                const match = cleanLine.match(/^\d+\.\s+(.+?),\s*([a-zA-Z0-9_]+)/);

                if (match) {
                    players.push({ name: match[1].trim(), id: match[2].trim() });
                }
            });
        }
        res.json({ success: true, players });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ============================================================
// 4. SEND GLOBAL CHAT / BROADCAST
// ============================================================

router.post('/instances/:id/rcon/chat', async (req, res) => {
    const instance = getInstance(req.params.id);
    if (!instance || instance.status !== 'Running') {
        return res.status(400).json({ success: false });
    }

    const { type, message, sender } = req.body;
    try {
        const rcon = await getRconConnection(instance, 5000);
        let cmd = "";

        if (type === "broadcast") {
            cmd = `broadcast ${message}`;
        } else {
            cmd = `serverchat ${sender ? `[${sender}] ` : ''}${message}`;
        }

        await rcon.send(cmd);
        rcon.end();
        res.json({ success: true, message: "Message sent!" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ============================================================
// 5. GET HISTORICAL LOG
// ============================================================

router.get('/instances/:id/rcon/log', (req, res) => {
    const instance = getInstance(req.params.id);
    if (!instance) return res.status(404).json({ success: false });

    const logPath = path.join(instance.path, 'ShooterGame', 'Saved', 'Logs', 'ShooterGame.log');
    if (!fs.existsSync(logPath)) {
        return res.json({ success: true, logs: ["Waiting for the server to generate a log file..."] });
    }

    exec(`tail -n 200 "${logPath}"`, (err, stdout) => {
        if (err) return res.json({ success: true, logs: ["Could not read log file."] });
        res.json({ success: true, logs: stdout.split('\n').filter(l => l.trim()) });
    });
});

module.exports = router;