// ============================================================
// Tuxruku ASA Manager - BACKUP MANAGER
// ============================================================

const express = require('express');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const multer = require('multer');
const router = express.Router();

const INSTANCES_FILE = path.join(__dirname, '..', 'data', 'instances.json');

// ============================================================
// HELPERS & CONFIG
// ============================================================

function getInstance(id) {
    if (!fs.existsSync(INSTANCES_FILE)) return null;
    return JSON.parse(fs.readFileSync(INSTANCES_FILE, 'utf8')).find(i => i.id === parseInt(id));
}

// Multer setup for direct upload to the server's backup directory
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const inst = getInstance(req.params.id);
        if (!inst) return cb(new Error("Server instance not found"), null);

        const backupDir = path.join(inst.path, 'Backups');
        if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

        cb(null, backupDir);
    },
    filename: function (req, file, cb) {
        cb(null, 'upload_' + Date.now() + '_' + file.originalname.replace(/\s+/g, '_'));
    }
});
const upload = multer({ storage: storage });

// ============================================================
// 1. CREATE LOCAL BACKUP (.tar.gz)
// ============================================================

router.post('/instances/:id/backup/create', (req, res) => {
    const inst = getInstance(req.params.id);
    if (!inst) return res.status(404).json({ success: false, message: 'Instance not found.' });

    const backupDir = path.join(inst.path, 'Backups');
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/T/, '_').replace(/\..+/, '').replace(/:/g, '-');
    const backupFilePath = path.join(backupDir, `backup_${timestamp}.tar.gz`);

    const cmd = `tar -czf "${backupFilePath}" -C "${path.join(inst.path, 'ShooterGame')}" Saved`;

    exec(cmd, (err) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true, message: 'Snapshot created successfully!' });
    });
});

// ============================================================
// 2. UPLOAD EXTERNAL SAVEFILE (.zip / .tar.gz)
// ============================================================

router.post('/instances/:id/backup/upload', upload.single('savefile'), (req, res) => {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file was received.' });
    res.json({ success: true, message: 'Save file uploaded to vault! You can now restore it.' });
});

// ============================================================
// 3. LIST ALL BACKUPS & UPLOADS
// ============================================================

router.get('/instances/:id/backup/list', (req, res) => {
    const inst = getInstance(req.params.id);
    if (!inst) return res.status(404).json({ success: false, message: 'Instance not found.' });

    const backupDir = path.join(inst.path, 'Backups');
    if (!fs.existsSync(backupDir)) return res.json({ success: true, backups: [] });

    fs.readdir(backupDir, (err, files) => {
        if (err) return res.status(500).json({ success: false, message: 'Error reading backup directory.' });

        const backups = files
            .filter(f => (f.startsWith('backup_') || f.startsWith('upload_')) && (f.endsWith('.tar.gz') || f.endsWith('.zip')))
            .map(f => {
                const stats = fs.statSync(path.join(backupDir, f));
                return {
                    filename: f,
                    size: (stats.size / (1024 * 1024)).toFixed(2) + " MB",
                    created: stats.mtime
                };
            });

        backups.sort((a, b) => b.created - a.created);
        res.json({ success: true, backups });
    });
});

// ============================================================
// 4. RESTORE SAVEFILE (Handles .tar.gz, .zip, and SP conversion)
// ============================================================

router.post('/instances/:id/backup/restore', (req, res) => {
    const inst = getInstance(req.params.id);
    if (!inst) return res.status(404).json({ success: false, message: 'Instance not found.' });
    if (inst.status === 'Running') {
        return res.status(400).json({ success: false, message: 'CRITICAL: Stop the server before restoring!' });
    }

    const { filename } = req.body;
    const backupFilePath = path.join(inst.path, 'Backups', filename);
    if (!fs.existsSync(backupFilePath)) {
        return res.status(404).json({ success: false, message: 'File does not exist.' });
    }

    const shooterGameDir = path.join(inst.path, 'ShooterGame');
    const savedDir = path.join(shooterGameDir, 'Saved');

    // Remove existing world state to prevent conflicts
    const deleteCmd = `rm -rf "${savedDir}"`;

    // Extract command based on file type
    let extractCmd = "";
    if (filename.endsWith('.zip')) {
        extractCmd = `unzip -q -o "${backupFilePath}" -d "${shooterGameDir}"`;
    } else {
        extractCmd = `tar -xzf "${backupFilePath}" -C "${shooterGameDir}"`;
    }

    // Windows/Singleplayer directory conversion logic
    const fixPathsCmd = `
        if [ -d "${shooterGameDir}/SavedArksLocal" ]; then
            mkdir -p "${savedDir}"
            mv "${shooterGameDir}/SavedArksLocal" "${savedDir}/SavedArks"
        fi
        
        if [ -d "${shooterGameDir}/Config" ]; then
            mkdir -p "${savedDir}"
            mv "${shooterGameDir}/Config" "${savedDir}/"
        fi
        
        if [ -d "${savedDir}/SavedArksLocal" ]; then
            mv "${savedDir}/SavedArksLocal" "${savedDir}/SavedArks"
        fi
    `;

    console.log(`[Backup] Restoring and converting ${filename} for ${inst.name}...`);

    exec(`${deleteCmd} && ${extractCmd} && ${fixPathsCmd}`, (err) => {
        if (err) {
            console.error("[Backup] Restore failed:", err);
            return res.status(500).json({ success: false, message: 'Extraction failed. Ensure the archive is valid.' });
        }
        res.json({ success: true, message: 'World restored and installed successfully!' });
    });
});

// ============================================================
// 5. DELETE FILE FROM VAULT
// ============================================================

router.delete('/instances/:id/backup/:filename', (req, res) => {
    const inst = getInstance(req.params.id);
    if (!inst) return res.status(404).json({ success: false, message: 'Instance not found.' });

    const backupFilePath = path.join(inst.path, 'Backups', req.params.filename);
    if (fs.existsSync(backupFilePath)) fs.unlinkSync(backupFilePath);

    res.json({ success: true, message: 'Backup deleted.' });
});

module.exports = router;