// ============================================================
// Tuxruku ASA Manager - AUTHENTICATION & PERMISSIONS
// ============================================================

const express = require('express');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const router = express.Router();
const USERS_FILE = path.join(__dirname, '..', 'data', 'users.json');

// ============================================================
// HELPERS
// ============================================================

function loadUsers() {
    if (!fs.existsSync(USERS_FILE)) return [];
    return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
}

function saveUsers(users) {
    if (!fs.existsSync(path.dirname(USERS_FILE))) {
        fs.mkdirSync(path.dirname(USERS_FILE), { recursive: true });
    }
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// Auto-seed default admin account on first run
(function seedAdmin() {
    const users = loadUsers();
    if (users.length === 0) {
        const hashedPassword = bcrypt.hashSync('admin123', 10);
        users.push({
            id: 1000,
            username: 'admin',
            password: hashedPassword,
            role: 'admin',
            allowedServers: []
        });
        saveUsers(users);
        console.log("⚠️ [SECURITY] No users found. Created default account: admin / admin123");
    }
})();

// Middleware to protect admin-only routes
function requireAdmin(req, res, next) {
    if (req.session && req.session.role === 'admin') return next();
    return res.status(403).json({ success: false, message: 'Access denied: Admin role required.' });
}

// ============================================================
// PUBLIC ROUTES
// ============================================================

router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const users = loadUsers();
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());

    if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ success: false, message: 'Invalid username or password.' });
    }

    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.role = user.role || 'user';
    req.session.allowedServers = user.allowedServers || [];

    res.json({ success: true, role: user.role });
});

router.post('/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

// ============================================================
// ADMIN PANEL API
// ============================================================

router.get('/admin/users', requireAdmin, (req, res) => {
    const users = loadUsers().map(({ password, ...u }) => u);
    res.json({ success: true, users });
});

router.post('/admin/users', requireAdmin, async (req, res) => {
    const { username, password, role, allowedServers } = req.body;
    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Missing required fields.' });
    }

    const users = loadUsers();
    if (users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
        return res.status(400).json({ success: false, message: 'Username is already taken.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    users.push({
        id: Date.now(),
        username,
        password: hashedPassword,
        role: role || 'user',
        allowedServers: allowedServers || []
    });

    saveUsers(users);
    res.json({ success: true, message: 'User created successfully!' });
});

router.put('/admin/users/:id', requireAdmin, (req, res) => {
    const users = loadUsers();
    const user = users.find(u => u.id === parseInt(req.params.id));

    if (!user) {
        return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (req.body.role) user.role = req.body.role;
    if (req.body.allowedServers) user.allowedServers = req.body.allowedServers.map(Number);

    saveUsers(users);
    res.json({ success: true, message: 'Permissions updated successfully!' });
});

router.delete('/admin/users/:id', requireAdmin, (req, res) => {
    let users = loadUsers();
    if (parseInt(req.params.id) === 1000) {
        return res.status(400).json({ success: false, message: 'Cannot delete the primary admin account.' });
    }

    users = users.filter(u => u.id !== parseInt(req.params.id));
    saveUsers(users);
    res.json({ success: true, message: 'User deleted successfully.' });
});

// ============================================================
// SYSTEM & ENV MANAGER API
// ============================================================

router.get('/admin/system/env', requireAdmin, (req, res) => {
    const envPath = path.join(__dirname, '..', '.env');
    let content = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';

    // Enkel parser for å sende verdiene til frontend
    const envVars = { port: '', serverIp: '', localIp: '' };
    content.split('\n').forEach(line => {
        if (line.startsWith('PORT=')) envVars.port = line.split('=')[1].trim();
        if (line.startsWith('SERVER_IP=')) envVars.serverIp = line.split('=')[1].trim();
        if (line.startsWith('LOCAL_IP=')) envVars.localIp = line.split('=')[1].trim();
    });

    res.json({ success: true, env: envVars });
});

router.post('/admin/system/env', requireAdmin, (req, res) => {
    const { port, serverIp, localIp } = req.body;
    const envPath = path.join(__dirname, '..', '.env');

    const newEnv = `PORT=${port || 8686}\nSERVER_IP=${serverIp || '127.0.0.1'}\nLOCAL_IP=${localIp || '127.0.0.1'}\n`;
    fs.writeFileSync(envPath, newEnv);

    res.json({ success: true, message: 'System environment variables updated.' });
});

router.post('/admin/system/restart', requireAdmin, (req, res) => {
    res.json({ success: true, message: 'Restart signal sent. Server will reboot in 2 seconds.' });
    // Dreper Node-prosessen etter 2 sekunder. Systemd (Linux) vil da starte den på nytt automatisk.
    setTimeout(() => { process.exit(0); }, 2000);
});

module.exports = router;