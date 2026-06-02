// ============================================================
// Tuxruku ASA Manager - RCON SCHEMA
// ============================================================

module.exports = {
    // RCON Quick Commands
    quickCommands: [
        { id: "save", label: "Save World", i18n: "rcon_quick_save", command: "saveworld", color: "bg-emerald-600", icon: "fa-floppy-disk", timeout: 15000 },
        { id: "destroywild", label: "Wipe Wild Dinos", i18n: "rcon_quick_wipe_wild", command: "destroywilddinos", color: "bg-red-600", icon: "fa-skull", timeout: 5000 },
        { id: "day", label: "Set Time: Day", i18n: "rcon_quick_time_day", command: "settimeofday 09:00", color: "bg-yellow-600", icon: "fa-sun", timeout: 5000 },
        { id: "night", label: "Set Time: Night", i18n: "rcon_quick_time_night", command: "settimeofday 21:00", color: "bg-indigo-600", icon: "fa-moon", timeout: 5000 },
        { id: "clearweather", label: "Clear Weather", i18n: "rcon_quick_clear_weather", command: "ce clearweather", color: "bg-sky-600", icon: "fa-cloud-sun", timeout: 5000 }
    ],

    // Chat Types
    chatTypes: [
        { id: "broadcast", label: "Broadcast (Center Screen)", i18n: "rcon_chat_broadcast", prefix: "broadcast" },
        { id: "serverchat", label: "Server Chat (Chatbox)", i18n: "rcon_chat_server", prefix: "serverchat" }
    ]
};