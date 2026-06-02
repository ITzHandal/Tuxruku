const session = require('express-session');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { Rcon } = require('rcon-client');
const { spawn, execSync, exec } = require('child_process');
const fetch = require('node-fetch');
const AbortController = require('abort-controller');
const os = require('os');
const cron = require('node-cron');

dotenv.config();
const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 8686;
const SERVER_IP = process.env.SERVER_IP || '127.0.0.1';
const LOCAL_IP = process.env.LOCAL_IP || '127.0.0.1';

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const MOD_NAMES_FILE = path.join(DATA_DIR, 'mod_names.json');
const INSTANCES_FILE = path.join(DATA_DIR, 'instances.json');
const MAPS_FILE = path.join(DATA_DIR, 'maps.json');
const VERSIONS_FILE = path.join(DATA_DIR, 'versions.json');


if (!fs.existsSync(INSTANCES_FILE)) fs.writeFileSync(INSTANCES_FILE, '[]');
if (!fs.existsSync(MOD_NAMES_FILE)) fs.writeFileSync(MOD_NAMES_FILE, '{}');
if (!fs.existsSync(MAPS_FILE)) fs.writeFileSync(MAPS_FILE, JSON.stringify([
    { name: "The Island", value: "TheIsland_WP" },
    { name: "Scorched Earth", value: "ScorchedEarth_WP" },
    { name: "The Center", value: "TheCenter_WP" }
], null, 2));
if (!fs.existsSync(VERSIONS_FILE)) fs.writeFileSync(VERSIONS_FILE, JSON.stringify([
    { id: "latest", name: "Latest Official Release", status: "Not Installed" }
], null, 2));

const activeServers = {};

app.use(express.json());

// ============================================================
// SECURITY & SESSIONS (THE BOUNCER)
// ============================================================
app.use(session({
    secret: 'asa-manager-super-secret-key-123!',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 1000 * 60 * 60 * 24 * 7 } // 7-day login persistence
}));

// Open Auth API (Must be public for login access)
app.use('/auth', require('./routes/auth-manager.js'));

// GLOBAL MIDDLEWARE: Verifies all requests before granting access
app.use((req, res, next) => {
    // Allowed public routes (Login screen and assets)
    const openRoutes = ['/login.html'];
    if (openRoutes.includes(req.path) || req.path.endsWith('.css') || req.path.endsWith('.js') || req.path.endsWith('.woff2')) {
        return next();
    }

    // Does the user have a valid session?
    if (!req.session.userId) {
        if (req.path.startsWith('/api')) return res.status(401).json({ success: false, message: 'Unauthorized' });
        return res.redirect('/login.html');
    }

    // SECURITY: Prevent standard users from accessing admin routes
    if ((req.path === '/admin.html' || req.path === '/server-admin') && req.session.role !== 'admin') {
        return res.redirect('/');
    }

    // If logged in and authorized, proceed
    next();
});

// Serve public directory safely behind the middleware
app.use(express.static(path.join(__dirname, 'public')));

// Reset ghost statuses on boot (e.g., if Node crashed while servers were running)
if (fs.existsSync(INSTANCES_FILE)) {
    try {
        const bootInstances = JSON.parse(fs.readFileSync(INSTANCES_FILE, 'utf8'));
        bootInstances.forEach(i => i.status = 'Stopped');
        fs.writeFileSync(INSTANCES_FILE, JSON.stringify(bootInstances, null, 2));
    } catch (e) {}
}

app.get('/api/config', (req, res) => {
    const lang = req.query.lang || 'en';
    const langPath = path.join(__dirname, 'locales', `${lang}.json`);

    if (!fs.existsSync(langPath)) {
        return res.json({ translation: {} });
    }

    const translation = JSON.parse(fs.readFileSync(langPath, 'utf8'));
    res.json({ translation });
});

app.get('/api/maps', (req, res) => res.json(JSON.parse(fs.readFileSync(MAPS_FILE, 'utf8'))));

// SMART FILTERING: Return only the instances the user is allowed to see
app.get('/api/instances', (req, res) => {
    const instances = JSON.parse(fs.readFileSync(INSTANCES_FILE, 'utf8'));
    if (req.session.role === 'admin') return res.json(instances);

    const filtered = instances.filter(i => req.session.allowedServers && req.session.allowedServers.includes(i.id));
    res.json(filtered);
});

app.get('/api/versions', (req, res) => res.json(JSON.parse(fs.readFileSync(VERSIONS_FILE, 'utf8'))));

// SECURITY MIDDLEWARE: Prevent unauthorized instance interactions (start/stop/settings/rcon)
app.use('/api/instances/:id', (req, res, next) => {
    const instanceId = parseInt(req.params.id);
    if (req.session.role === 'admin') return next();
    if (req.session.allowedServers && req.session.allowedServers.includes(instanceId)) return next();

    return res.status(403).json({ success: false, message: 'You do not have permission to access this server!' });
});

// Route to safely load the admin panel
app.get('/server-admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// ============================================================
// SYSTEM MAINTENANCE & INSTALLATION
// ============================================================
app.post('/api/versions/download', (req, res) => {
    const installDir = '/home/ark/asa-versions/latest';
    const steamcmd = spawn('/home/ark/steamcmd/steamcmd.sh', ['+force_install_dir', installDir, '+login', 'anonymous', '+app_update', '2430930', 'validate', '+quit']);

    steamcmd.stdout.on('data', (data) => io.emit('version-download-log', data.toString()));

    steamcmd.on('close', (code) => {
        const versions = JSON.parse(fs.readFileSync(VERSIONS_FILE, 'utf8'));
        const latest = versions.find(v => v.id === 'latest');
        if (latest) {
            latest.status = code === 0 ? 'Installed' : 'Error';
            fs.writeFileSync(VERSIONS_FILE, JSON.stringify(versions, null, 2));
        }
        io.emit('version-download-complete', code);
    });
    res.json({ success: true });
});

app.post('/api/instances', async (req, res) => {
    const { name, map, port } = req.body;
    const instances = JSON.parse(fs.readFileSync(INSTANCES_FILE, 'utf8'));
    const instanceFolderName = name.replace(/\s+/g, '_');
    const instancePath = `/home/ark/asa-servers/${instanceFolderName}`;
    const basePath = '/home/ark/asa-versions/latest';

    try {
        if (!fs.existsSync(basePath)) return res.status(400).json({ success: false, message: "Base game missing! Please install it first." });

        await fs.promises.mkdir(instancePath, { recursive: true });
        await fs.promises.mkdir(path.join(instancePath, 'ShooterGame', 'Saved', 'Config', 'WindowsServer'), { recursive: true });
        await fs.promises.mkdir(path.join(instancePath, 'ShooterGame', 'Saved', 'Logs'), { recursive: true });

        fs.cpSync(path.join(basePath, 'Engine'), path.join(instancePath, 'Engine'), { recursive: true });
        fs.cpSync(path.join(basePath, 'ShooterGame', 'Binaries'), path.join(instancePath, 'ShooterGame', 'Binaries'), { recursive: true });

        for (let dir of ['ShooterGame/Content', 'ShooterGame/Plugins', 'ShooterGame/Config']) {
            const srcPath = path.join(basePath, dir);
            const destPath = path.join(instancePath, dir);
            if (fs.existsSync(srcPath)) {
                await fs.promises.mkdir(path.dirname(destPath), { recursive: true });
                if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
                await fs.promises.symlink(srcPath, destPath, 'dir');
            }
        }
        fs.writeFileSync(path.join(instancePath, 'ShooterGame', 'Binaries', 'Win64', 'steam_appid.txt'), '2430930');

        const newInstance = { id: Date.now(), name, map, port, status: 'Stopped', path: instancePath };
        const cleanInstances = instances.filter(i => i.name !== name);
        cleanInstances.push(newInstance);
        fs.writeFileSync(INSTANCES_FILE, JSON.stringify(cleanInstances, null, 2));

        res.json({ success: true, instance: newInstance });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================================
// DELETE SERVER INSTANCE (With Password Verification and Cleanup)
// ============================================================
app.delete('/api/instances/:id', async (req, res) => {
    const instanceId = parseInt(req.params.id);
    const { adminPassword } = req.body;
    const instances = JSON.parse(fs.readFileSync(INSTANCES_FILE, 'utf8'));
    const instanceIndex = instances.findIndex(i => i.id === instanceId);

    if (instanceIndex === -1) return res.status(404).json({ success: false, message: "Instance not found." });
    const instance = instances[instanceIndex];

    // 1. VERIFY PASSWORD (From settings, fallback to "admin")
    const correctPassword = instance.settings?.ServerAdminPassword || "admin";
    if (adminPassword !== correctPassword) {
        return res.status(401).json({ success: false, message: "Invalid Admin password! Deletion aborted." });
    }

    // 2. STOP SERVER IF RUNNING
    if (activeServers[instanceId]) {
        if (activeServers[instanceId].tailProcess) activeServers[instanceId].tailProcess.kill();
        try { execSync(`pkill -f "ArkAscendedServer.exe.*Port=${instance.port}"`); } catch (e) {}
        delete activeServers[instanceId];
    }

    // 3. DELETE MAIN DIRECTORY (Game files)
    try {
        if (fs.existsSync(instance.path)) {
            fs.rmSync(instance.path, { recursive: true, force: true });
        }
    } catch (e) {
        console.error(`[Deletion] Error deleting directory: ${instance.path}`, e);
    }

    // 4. DELETE BACKUPS (Prevent orphaned backups from consuming disk space)
    try {
        const backupDir = path.join(__dirname, 'data', 'backups');
        if (fs.existsSync(backupDir)) {
            const files = fs.readdirSync(backupDir);
            for (const file of files) {
                if (file.startsWith(`backup-${instanceId}-`)) {
                    fs.unlinkSync(path.join(backupDir, file));
                }
            }
        }
    } catch (e) {
        console.error(`[Deletion] Error deleting backups for: ${instanceId}`, e);
    }

    // 5. REMOVE FROM DATABASE
    instances.splice(instanceIndex, 1);
    fs.writeFileSync(INSTANCES_FILE, JSON.stringify(instances, null, 2));

    io.emit('status-update');
    res.json({ success: true, message: "Server and all associated files were permanently deleted." });
});

// ============================================================
// SERVER CONTROL (START & STOP)
// ============================================================
app.post('/api/instances/:id/start', (req, res) => {
    const instanceId = parseInt(req.params.id);
    const instances = JSON.parse(fs.readFileSync(INSTANCES_FILE, 'utf8'));
    const instance = instances.find(i => i.id === instanceId);

    if (!instance || activeServers[instanceId]) return res.status(400).json({ success: false });

    const basePort = parseInt(instance.port);
    const queryPort = basePort + 1;
    const rconPort = basePort + 10;

    const gusPath = path.join(instance.path, 'ShooterGame', 'Saved', 'Config', 'WindowsServer', 'GameUserSettings.ini');
    let sessionName = instance.name;
    let serverPassword = "";
    let adminPassword = "admin";
    let maxPlayers = (instance.settings && instance.settings.maxPlayers) || instance.maxPlayers || 70;

    if (fs.existsSync(gusPath)) {
        const content = fs.readFileSync(gusPath, 'utf8');
        const sName = content.match(/SessionName=([^\n\r]+)/);
        const sPass = content.match(/ServerPassword=([^\n\r]+)/);
        const aPass = content.match(/ServerAdminPassword=([^\n\r]+)/);

        if (sName) sessionName = sName[1].trim();
        if (sPass) serverPassword = sPass[1].trim();
        if (aPass) adminPassword = aPass[1].trim();
    }

    const passString = (serverPassword && serverPassword !== "0")
        ? `?ServerPassword=${serverPassword}`
        : '';

    const launchArgs =
        `${instance.map}` +
        `?listen` +
        `?SessionName=${sessionName}` +
        `?Port=${basePort}` +
        `?QueryPort=${queryPort}` +
        `?MaxPlayers=${maxPlayers}` +
        `${passString}` +
        `?RCONEnabled=True` +
        `?RCONPort=${rconPort}` +
        `?ServerAdminPassword=${adminPassword}`;

    const startScriptPath = path.join(instance.path, 'start.sh');
    const savedMods = (instance.settings && instance.settings.mods) ? instance.settings.mods : (instance.mods || '')
    const autoUpdateMods = instance.settings?.AutoUpdateMods !== false;

    if (savedMods && fs.existsSync(gusPath)) {
        let gusContent = fs.readFileSync(gusPath, 'utf8');
        if (/^ActiveMods=.*$/m.test(gusContent)) {
            gusContent = gusContent.replace(/^ActiveMods=.*$/m, `ActiveMods=${savedMods}`);
        } else {
            gusContent = gusContent.replace(/\[ServerSettings\]/, `[ServerSettings]\nActiveMods=${savedMods}`);
        }
        fs.writeFileSync(gusPath, gusContent);
    }

    const modFlag = (savedMods && autoUpdateMods) ? `-mods=${savedMods}` : '';

    fs.writeFileSync(
        startScriptPath,
        `#!/bin/bash
        ulimit -n 100000
        
        xvfb-run --auto-servernum --server-args="-screen 0 1024x768x24:32" \
        wine ArkAscendedServer.exe "${launchArgs}" \
        ${modFlag} \
        -MultiHome=${SERVER_IP} \
        -server \
        -log \
        -nosteamclient \
        -culture=en \
        -servergamelog \
        -NoBattlEye
        `
    );

    fs.chmodSync(startScriptPath, '755');

    try {
        const serverProcess = spawn('bash', [startScriptPath, launchArgs], {
            cwd: path.join(instance.path, 'ShooterGame', 'Binaries', 'Win64'),
            env: Object.assign({}, process.env, { WINEDEBUG: '-all', WINEDLLOVERRIDES: 'mscoree=d;mshtml=d' })
        });

        activeServers[instanceId] = serverProcess;
        instance.status = 'Running';
        fs.writeFileSync(INSTANCES_FILE, JSON.stringify(instances, null, 2));
        io.emit('status-update', { id: instanceId, status: 'Running' });

        serverProcess.stderr.on('data', (data) => io.emit(`console-${instanceId}`, `[SYS-ERROR] ${data.toString()}`));
        const logFilePath = path.join(instance.path, 'ShooterGame', 'Saved', 'Logs', 'ShooterGame.log');
        if (!fs.existsSync(logFilePath)) fs.writeFileSync(logFilePath, 'Initializing...\n');

        const tailProcess = spawn('tail', ['-n', '50', '-F', logFilePath]);
        tailProcess.stdout.on('data', (data) => io.emit(`console-${instanceId}`, data.toString()));
        activeServers[instanceId].tailProcess = tailProcess;

        serverProcess.on('close', (code) => {
            if (activeServers[instanceId]?.tailProcess) activeServers[instanceId].tailProcess.kill();
            delete activeServers[instanceId];
            const currentInstances = JSON.parse(fs.readFileSync(INSTANCES_FILE, 'utf8'));
            const instToUpdate = currentInstances.find(i => i.id === instanceId);
            if(instToUpdate) {
                instToUpdate.status = 'Stopped';
                fs.writeFileSync(INSTANCES_FILE, JSON.stringify(currentInstances, null, 2));
            }
            io.emit('status-update', { id: instanceId, status: 'Stopped' });
        });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false });
    }
});

// GRACEFUL SHUTDOWN WITH DYNAMIC PASSWORD
app.post('/api/instances/:id/stop', async (req, res) => {
    const instanceId = parseInt(req.params.id);
    const instances = JSON.parse(fs.readFileSync(INSTANCES_FILE, 'utf8'));
    const instance = instances.find(i => i.id === instanceId);

    if (!instance) return res.status(400).json({ success: false, message: "Instance not found." });

    const serverInfo = activeServers[instanceId];
    const sessionName = instance.settings?.SessionName || instance.name;
    const adminPass = instance.settings?.ServerAdminPassword || 'admin';

    let rconSaved = false;
    try {
        const rcon = new Rcon({
            host: LOCAL_IP,
            port: parseInt(instance.port) + 10,
            password: adminPass,
            timeout: 15000
        });

        rcon.on('error', (err) => { console.log(`[RCON Background Error Ignored] ${err.message}`); });
        await rcon.connect();

        console.log(`[RCON] Sending saveworld before shutdown for ${sessionName}...`);
        await rcon.send('saveworld');
        await new Promise(r => setTimeout(r, 3000));
        await rcon.send('doexit');
        rcon.end();
        rconSaved = true;
    } catch (e) {
        console.error(`[RCON Error] Could not shut down gracefully: ${e.message}`);
    }

    setTimeout(() => {
        if (serverInfo && serverInfo.tailProcess) {
            serverInfo.tailProcess.kill();
        }

        try {
            execSync(`pkill -f "ArkAscendedServer.exe.*Port=${instance.port}"`);
        } catch (e) {}

        delete activeServers[instanceId];
        const currentInstances = JSON.parse(fs.readFileSync(INSTANCES_FILE, 'utf8'));
        const instToUpdate = currentInstances.find(i => i.id === instanceId);
        if(instToUpdate) {
            instToUpdate.status = 'Stopped';
            fs.writeFileSync(INSTANCES_FILE, JSON.stringify(currentInstances, null, 2));
        }

        io.emit('status-update', { id: instanceId, status: 'Stopped' });
    }, rconSaved ? 15000 : 2000);

    res.json({ success: true, message: "Shutdown initiated." });
});

// ============================================================
// MOD MANAGER PROXY APIS (CurseForge)
// ============================================================
app.get('/api/mods/search', async (req, res) => {
    const query = req.query.q || '';
    if (!query) return res.json({ success: true, mods: [] });
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        const response = await fetch(`https://api.curse.tools/v1/cf/mods/search?gameId=83374&searchFilter=${encodeURIComponent(query)}`, { signal: controller.signal });
        clearTimeout(timeout);
        const data = await response.json();
        const mappedMods = (data.data || []).map(m => ({
            id: m.id, name: m.name, summary: m.summary || 'No summary', thumbnail: m.logo?.thumbnailUrl || '', author: m.authors?.[0]?.name || 'Unknown'
        }));
        res.json({ success: true, mods: mappedMods });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

app.get('/api/mods/names', async (req, res) => {
    let cachedNames = {};
    if (fs.existsSync(MOD_NAMES_FILE)) { try { cachedNames = JSON.parse(fs.readFileSync(MOD_NAMES_FILE, 'utf8')); } catch (e) {} }
    const idsParam = req.query.ids || '';
    if (!idsParam) return res.json({ success: true, names: cachedNames });
    const ids = idsParam.split(',').map(x => x.trim()).filter(Boolean);
    const resultNames = {};

    for (const id of ids) {
        if (cachedNames[id]) { resultNames[id] = cachedNames[id]; continue; }
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 10000);
            const response = await fetch(`https://api.curse.tools/v1/cf/mods/${id}`, { signal: controller.signal });
            clearTimeout(timeout);
            if (!response.ok) { resultNames[id] = `Unknown Mod (${id})`; continue; }
            const data = await response.json();
            const modName = data?.data?.name || `Unknown Mod (${id})`;
            resultNames[id] = modName;
            cachedNames[id] = modName;
        } catch (err) { resultNames[id] = `Unknown Mod (${id})`; }
    }
    try { if (!fs.existsSync('./data')) fs.mkdirSync('./data'); fs.writeFileSync(MOD_NAMES_FILE, JSON.stringify(cachedNames, null, 2)); } catch (e) {}
    res.json({ success: true, names: cachedNames });
});

app.post('/api/mods/names', (req, res) => {
    const { id, name } = req.body;
    if (!id || !name) return res.status(400).json({ success: false });
    let modNames = {};
    if (fs.existsSync(MOD_NAMES_FILE)) { try { modNames = JSON.parse(fs.readFileSync(MOD_NAMES_FILE, 'utf8')); } catch (e) {} }
    modNames[id.toString()] = name;
    fs.writeFileSync(MOD_NAMES_FILE, JSON.stringify(modNames, null, 2));
    res.json({ success: true });
});

// ============================================================
// FRONTEND PAGE ROUTES
// ============================================================
app.get('/server-settings', (req, res) => res.sendFile(path.join(__dirname, 'public', 'settings.html')));
app.get('/server-backup', (req, res) => res.sendFile(path.join(__dirname, 'public', 'backup.html')));
app.get('/server-rcon', (req, res) => res.sendFile(path.join(__dirname, 'public', 'rcon-dashboard.html')));

// Load external API Managers
app.use('/api', require('./routes/backup-manager.js'));
app.use('/api', require('./routes/settings-manager.js'));
app.use('/api', require('./routes/rcon-manager.js'));

// ============================================================
// LIVE SYSTEM MONITORING (CPU, RAM, DISK)
// ============================================================
setInterval(() => {
    // 1. RAM Calculation
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const ramPercent = ((usedMem / totalMem) * 100).toFixed(1);

    // 2. CPU Calculation (Based on Linux Load Average)
    const cores = os.cpus().length;
    const loadAvg = os.loadavg()[0];
    let cpuPercent = ((loadAvg / cores) * 100).toFixed(1);
    if (cpuPercent > 100) cpuPercent = 100; // Cap at 100% for display

    // 3. Disk and Uptime
    exec("df -h / | awk 'NR==2 {print $5}'", (err, stdout) => {
        const diskPercent = stdout ? stdout.trim() : '0%';
        const uptimeSeconds = os.uptime();
        const days = Math.floor(uptimeSeconds / (3600 * 24));
        const hours = Math.floor((uptimeSeconds % (3600 * 24)) / 3600);

        io.emit('system-stats', {
            cpu: cpuPercent,
            ramPercent: ramPercent,
            ramUsed: (usedMem / 1024 / 1024 / 1024).toFixed(1),
            ramTotal: (totalMem / 1024 / 1024 / 1024).toFixed(1),
            disk: diskPercent,
            uptime: `${days}d ${hours}h`
        });
    });
}, 5000);
// ============================================================
// AUTOMATION & CRON ENGINE (BACKUPS & TASKS)
// ============================================================
const activeCronJobs = {};

function startCronEngine() {
    console.log("[CRON] Starting automation engine...");
    if (!fs.existsSync(INSTANCES_FILE)) return;

    const instances = JSON.parse(fs.readFileSync(INSTANCES_FILE, 'utf8'));

    instances.forEach(inst => {
        const schedule = inst.settings?.AutoBackupSchedule || "0";
        const retentionLimit = parseInt(inst.settings?.AutoBackupRetention || 5);


        if (schedule !== "0") {
            console.log(`[CRON] Scheduling Auto-Backup for ${inst.name} (${schedule}) - Keeping max ${retentionLimit}`);

            activeCronJobs[inst.id] = cron.schedule(schedule, () => {
                console.log(`[CRON] Executing automated backup for ${inst.name}...`);

                const backupDir = path.join(inst.path, 'Backups');
                if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

                const timestamp = new Date().toISOString().replace(/T/, '_').replace(/\..+/, '').replace(/:/g, '-');

                const backupFilePath = path.join(backupDir, `auto_backup_${timestamp}.tar.gz`);

                const cmd = `tar -czf "${backupFilePath}" -C "${path.join(inst.path, 'ShooterGame')}" Saved`;

                exec(cmd, (err) => {
                    if (err) {
                        console.error(`[CRON] Backup failed for ${inst.name}:`, err);
                        return;
                    }
                    console.log(`[CRON] Backup created for ${inst.name}. Running cleanup...`);


                    fs.readdir(backupDir, (err, files) => {
                        if (err) return;


                        const backups = files
                            .filter(f => f.startsWith('backup_') || f.startsWith('auto_backup_'))
                            .map(f => ({
                                name: f,
                                time: fs.statSync(path.join(backupDir, f)).mtime.getTime()
                            }))
                            .sort((a, b) => b.time - a.time);


                        if (backups.length > retentionLimit) {
                            const filesToDelete = backups.slice(retentionLimit);
                            filesToDelete.forEach(file => {
                                fs.unlinkSync(path.join(backupDir, file.name));
                                console.log(`[CRON] Pruned old backup: ${file.name}`);
                            });
                        }
                    });
                });
            });
        }
    });
}

// Start motoren!
startCronEngine();
io.on('connection', (socket) => {});
server.listen(PORT, () => { console.log(`Tuxruku ASA Manager is running on port: ${PORT}`); });