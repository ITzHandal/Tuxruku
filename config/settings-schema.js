// ============================================================
// Tuxruku ASA Manager - SETTINGS SCHEMA
// ============================================================

module.exports = {
    categories: [
        {
            id: "tam_config",
            title: "TAM Launcher",
            i18n_title: "schema_cat_tam",
            settings: [
                {
                    key: "AutoUpdateMods",
                    label: "Auto-Update Mods on Startup",
                    i18n_label: "schema_lbl_auto_update_mods",
                    description: "Force CurseForge to check and download mod updates every time the server starts.",
                    i18n_desc: "schema_desc_auto_update_mods",
                    type: "checkbox",
                    ini: "TAM",
                    section: "Core",
                    default: true
                }
            ]
        },
        {
            id: "automation",
            title: "Automated Tasks",
            i18n_title: "schema_cat_automation",
            settings: [
                {
                    key: "AutoBackupSchedule",
                    label: "Auto-Backup Schedule",
                    i18n_label: "schema_lbl_auto_backup",
                    type: "select",
                    options: [
                        { value: "0", label: "Disabled / Av" },
                        { value: "0 * * * *", label: "Every Hour" },
                        { value: "0 */6 * * *", label: "Every 6 Hours" },
                        { value: "0 */12 * * *", label: "Every 12 Hours" },
                        { value: "0 4 * * *", label: "Daily at 04:00 AM" }
                    ],
                    ini: "TAM",
                    section: "Automation",
                    default: "0"
                },
                {
                    key: "AutoBackupRetention",
                    label: "Max Backups to Keep",
                    i18n_label: "schema_lbl_backup_retention",
                    description: "Older automated backups will be deleted when this limit is reached.",
                    i18n_desc: "schema_desc_backup_retention",
                    type: "number",
                    ini: "TAM",
                    section: "Automation",
                    default: 5,
                    min: 1,
                    max: 50,
                    step: 1
                }
            ]
        },
        {
            id: "rules",
            title: "Rules & Server",
            i18n_title: "schema_cat_rules",
            settings: [
                {
                    key: "SessionName",
                    label: "Session Name",
                    i18n_label: "schema_lbl_session_name",
                    type: "text",
                    ini: "GameUserSettings",
                    section: "ServerSettings",
                    default: "ASA Server"
                },
                {
                    key: "ServerPassword",
                    label: "Server Password",
                    i18n_label: "schema_lbl_server_password",
                    type: "text",
                    ini: "GameUserSettings",
                    section: "ServerSettings",
                    default: ""
                },
                {
                    key: "ServerAdminPassword",
                    label: "Admin Password",
                    i18n_label: "schema_lbl_admin_password",
                    type: "text",
                    ini: "GameUserSettings",
                    section: "ServerSettings",
                    default: "admin"
                },
                {
                    key: "ServerPVE",
                    label: "Enable PVE",
                    i18n_label: "schema_lbl_enable_pve",
                    type: "checkbox",
                    ini: "GameUserSettings",
                    section: "ServerSettings",
                    default: false
                },
                {
                    key: "Hardcore",
                    label: "Hardcore Mode",
                    i18n_label: "schema_lbl_hardcore",
                    type: "checkbox",
                    ini: "GameUserSettings",
                    section: "ServerSettings",
                    default: false
                },
                {
                    key: "AllowThirdPersonPlayer",
                    label: "Allow Third Person",
                    i18n_label: "schema_lbl_third_person",
                    type: "checkbox",
                    ini: "GameUserSettings",
                    section: "ServerSettings",
                    default: true
                },
                {
                    key: "ShowFloatingDamageText",
                    label: "Show Floating Damage Text",
                    i18n_label: "schema_lbl_floating_damage",
                    type: "checkbox",
                    ini: "GameUserSettings",
                    section: "ServerSettings",
                    default: true
                },
                {
                    key: "ServerCrosshair",
                    label: "Enable Crosshair",
                    i18n_label: "schema_lbl_crosshair",
                    type: "checkbox",
                    ini: "GameUserSettings",
                    section: "ServerSettings",
                    default: true
                },
                {
                    key: "AllowFlyerCarryPVE",
                    label: "Allow Flyer Carry (PVE)",
                    i18n_label: "schema_lbl_flyer_carry",
                    type: "checkbox",
                    ini: "GameUserSettings",
                    section: "ServerSettings",
                    default: true
                },
                {
                    key: "EnablePvPGamma",
                    label: "Enable Gamma In PVP",
                    i18n_label: "schema_lbl_gamma_pvp",
                    type: "checkbox",
                    ini: "GameUserSettings",
                    section: "ServerSettings",
                    default: false
                },
                {
                    key: "DisablePvEGamma",
                    label: "Disable Gamma In PVE",
                    i18n_label: "schema_lbl_gamma_pve",
                    type: "checkbox",
                    ini: "GameUserSettings",
                    section: "ServerSettings",
                    default: false
                },
                {
                    key: "ProximityChat",
                    label: "Enable Proximity Chat",
                    i18n_label: "schema_lbl_proximity_chat",
                    type: "checkbox",
                    ini: "GameUserSettings",
                    section: "ServerSettings",
                    default: false
                },
                {
                    key: "AlwaysNotifyPlayerJoined",
                    label: "Join Notifications",
                    i18n_label: "schema_lbl_join_notif",
                    type: "checkbox",
                    ini: "GameUserSettings",
                    section: "ServerSettings",
                    default: true
                },
                {
                    key: "AlwaysNotifyPlayerLeft",
                    label: "Leave Notifications",
                    i18n_label: "schema_lbl_leave_notif",
                    type: "checkbox",
                    ini: "GameUserSettings",
                    section: "ServerSettings",
                    default: true
                },
                {
                    key: "NoTributeDownloads",
                    label: "Disable Tribute Downloads",
                    i18n_label: "schema_lbl_no_tribute",
                    type: "checkbox",
                    ini: "GameUserSettings",
                    section: "ServerSettings",
                    default: false
                },
                {
                    key: "PreventDownloadSurvivors",
                    label: "Prevent Survivor Downloads",
                    i18n_label: "schema_lbl_no_survivor_dl",
                    type: "checkbox",
                    ini: "GameUserSettings",
                    section: "ServerSettings",
                    default: false
                },
                {
                    key: "PreventDownloadItems",
                    label: "Prevent Item Downloads",
                    i18n_label: "schema_lbl_no_item_dl",
                    type: "checkbox",
                    ini: "GameUserSettings",
                    section: "ServerSettings",
                    default: false
                },
                {
                    key: "PreventDownloadDinos",
                    label: "Prevent Dino Downloads",
                    i18n_label: "schema_lbl_no_dino_dl",
                    type: "checkbox",
                    ini: "GameUserSettings",
                    section: "ServerSettings",
                    default: false
                }
            ]
        },

        {
            id: "rates",
            title: "Rates & Progression",
            i18n_title: "schema_cat_rates",
            settings: [
                {
                    key: "XPMultiplier",
                    label: "XP Multiplier",
                    i18n_label: "schema_lbl_xp_mult",
                    type: "number",
                    ini: "GameUserSettings",
                    section: "ServerSettings",
                    default: 1,
                    min: 0.1,
                    max: 100,
                    step: 0.1
                },
                {
                    key: "TamingSpeedMultiplier",
                    label: "Taming Speed",
                    i18n_label: "schema_lbl_taming_speed",
                    type: "number",
                    ini: "GameUserSettings",
                    section: "ServerSettings",
                    default: 1,
                    min: 0.1,
                    max: 100,
                    step: 0.1
                },
                {
                    key: "HarvestAmountMultiplier",
                    label: "Harvest Amount",
                    i18n_label: "schema_lbl_harvest_amount",
                    type: "number",
                    ini: "GameUserSettings",
                    section: "ServerSettings",
                    default: 1,
                    min: 0.1,
                    max: 100,
                    step: 0.1
                },
                {
                    key: "BabyMatureSpeedMultiplier",
                    label: "Baby Mature Speed",
                    i18n_label: "schema_lbl_baby_mature",
                    type: "number",
                    ini: "Game",
                    section: "/Script/ShooterGame.ShooterGameMode",
                    default: 1,
                    min: 0.1,
                    max: 1000,
                    step: 0.1
                },
                {
                    key: "EggHatchSpeedMultiplier",
                    label: "Egg Hatch Speed",
                    i18n_label: "schema_lbl_egg_hatch",
                    type: "number",
                    ini: "Game",
                    section: "/Script/ShooterGame.ShooterGameMode",
                    default: 1,
                    min: 0.1,
                    max: 1000,
                    step: 0.1
                },
                {
                    key: "MatingIntervalMultiplier",
                    label: "Mating Interval",
                    i18n_label: "schema_lbl_mating_interval",
                    type: "number",
                    ini: "Game",
                    section: "/Script/ShooterGame.ShooterGameMode",
                    default: 1,
                    min: 0.001,
                    max: 100,
                    step: 0.001
                },
                {
                    key: "BabyCuddleIntervalMultiplier",
                    label: "Cuddle Interval",
                    i18n_label: "schema_lbl_cuddle_interval",
                    type: "number",
                    ini: "Game",
                    section: "/Script/ShooterGame.ShooterGameMode",
                    default: 1,
                    min: 0.01,
                    max: 100,
                    step: 0.01
                },
                {
                    key: "BabyImprintingStatScaleMultiplier",
                    label: "Imprint Bonus Scale",
                    i18n_label: "schema_lbl_imprint_scale",
                    type: "number",
                    ini: "Game",
                    section: "/Script/ShooterGame.ShooterGameMode",
                    default: 1,
                    min: 0.1,
                    max: 10,
                    step: 0.1
                },
                {
                    key: "BabyCuddleGracePeriodMultiplier",
                    label: "Cuddle Grace Period",
                    i18n_label: "schema_lbl_cuddle_grace",
                    type: "number",
                    ini: "Game",
                    section: "/Script/ShooterGame.ShooterGameMode",
                    default: 1,
                    min: 0.1,
                    max: 10,
                    step: 0.1
                },
                {
                    key: "CropGrowthSpeedMultiplier",
                    label: "Crop Growth Speed",
                    i18n_label: "schema_lbl_crop_growth",
                    type: "number",
                    ini: "Game",
                    section: "/Script/ShooterGame.ShooterGameMode",
                    default: 1,
                    min: 0.1,
                    max: 50,
                    step: 0.1
                },
                {
                    key: "FuelConsumptionIntervalMultiplier",
                    label: "Fuel Consumption",
                    i18n_label: "schema_lbl_fuel_consumption",
                    type: "number",
                    ini: "Game",
                    section: "/Script/ShooterGame.ShooterGameMode",
                    default: 1,
                    min: 0.1,
                    max: 10,
                    step: 0.1
                }
            ]
        },

        {
            id: "world",
            title: "World Settings",
            i18n_title: "schema_cat_world",
            settings: [
                {
                    key: "AutoSavePeriodMinutes",
                    label: "Auto Save Interval (Minutes)",
                    i18n_label: "schema_lbl_autosave",
                    description: "How often the server automatically saves the world.",
                    i18n_desc: "schema_desc_autosave",
                    type: "number",
                    ini: "GameUserSettings",
                    section: "ServerSettings",
                    default: 15,
                    min: 1,
                    max: 1440,
                    step: 1
                },
                {
                    key: "DayCycleSpeedScale",
                    label: "Day Cycle Speed",
                    i18n_label: "schema_lbl_day_cycle",
                    type: "number",
                    ini: "GameUserSettings",
                    section: "ServerSettings",
                    default: 1,
                    min: 0.1,
                    max: 10,
                    step: 0.1
                },
                {
                    key: "DayTimeSpeedScale",
                    label: "Day Time Speed",
                    i18n_label: "schema_lbl_day_time",
                    type: "number",
                    ini: "GameUserSettings",
                    section: "ServerSettings",
                    default: 1,
                    min: 0.1,
                    max: 10,
                    step: 0.1
                },
                {
                    key: "NightTimeSpeedScale",
                    label: "Night Time Speed",
                    i18n_label: "schema_lbl_night_time",
                    type: "number",
                    ini: "GameUserSettings",
                    section: "ServerSettings",
                    default: 1,
                    min: 0.1,
                    max: 10,
                    step: 0.1
                },
                {
                    key: "DifficultyOffset",
                    label: "Difficulty Offset",
                    i18n_label: "schema_lbl_diff_offset",
                    type: "number",
                    ini: "GameUserSettings",
                    section: "ServerSettings",
                    default: 1,
                    min: 0.1,
                    max: 10,
                    step: 0.1
                },
                {
                    key: "OverrideOfficialDifficulty",
                    label: "Override Official Difficulty",
                    i18n_label: "schema_lbl_override_diff",
                    type: "number",
                    ini: "GameUserSettings",
                    section: "ServerSettings",
                    default: 5,
                    min: 1,
                    max: 20,
                    step: 0.1
                },
                {
                    key: "MaxPersonalTamedDinos",
                    label: "Max Personal Tamed Dinos",
                    i18n_label: "schema_lbl_max_tamed",
                    type: "number",
                    ini: "GameUserSettings",
                    section: "ServerSettings",
                    default: 500,
                    min: 1,
                    max: 10000,
                    step: 1
                },
                {
                    key: "bDisableStructurePlacementCollision",
                    label: "Disable Structure Collision",
                    i18n_label: "schema_lbl_disable_collision",
                    type: "checkbox",
                    ini: "Game",
                    section: "/Script/ShooterGame.ShooterGameMode",
                    default: true
                },
                {
                    key: "bAllowUnlimitedRespecs",
                    label: "Unlimited Mindwipe",
                    i18n_label: "schema_lbl_unlimited_mindwipe",
                    type: "checkbox",
                    ini: "Game",
                    section: "/Script/ShooterGame.ShooterGameMode",
                    default: false
                },
                {
                    key: "bAllowFlyerSpeedLeveling",
                    label: "Allow Flyer Speed Leveling",
                    i18n_label: "schema_lbl_flyer_speed",
                    type: "checkbox",
                    ini: "Game",
                    section: "/Script/ShooterGame.ShooterGameMode",
                    default: true
                },
                {
                    key: "bAllowSpeedLeveling",
                    label: "Allow Speed Leveling",
                    i18n_label: "schema_lbl_speed_leveling",
                    type: "checkbox",
                    ini: "Game",
                    section: "/Script/ShooterGame.ShooterGameMode",
                    default: true
                }
            ]
        },

        {
            id: "player",
            title: "Player Multipliers",
            i18n_title: "schema_cat_player",
            settings: [
                {
                    key: "PlayerDamageMultiplier",
                    label: "Player Damage",
                    i18n_label: "schema_lbl_player_dmg",
                    type: "number",
                    ini: "GameUserSettings",
                    section: "ServerSettings",
                    default: 1,
                    min: 0.1,
                    max: 10,
                    step: 0.1
                },
                {
                    key: "PlayerResistanceMultiplier",
                    label: "Player Resistance",
                    i18n_label: "schema_lbl_player_res",
                    type: "number",
                    ini: "GameUserSettings",
                    section: "ServerSettings",
                    default: 1,
                    min: 0.1,
                    max: 10,
                    step: 0.1
                },
                {
                    key: "PlayerCharacterFoodDrainMultiplier",
                    label: "Food Drain",
                    i18n_label: "schema_lbl_food_drain",
                    type: "number",
                    ini: "GameUserSettings",
                    section: "ServerSettings",
                    default: 1,
                    min: 0.1,
                    max: 10,
                    step: 0.1
                },
                {
                    key: "PlayerCharacterWaterDrainMultiplier",
                    label: "Water Drain",
                    i18n_label: "schema_lbl_water_drain",
                    type: "number",
                    ini: "GameUserSettings",
                    section: "ServerSettings",
                    default: 1,
                    min: 0.1,
                    max: 10,
                    step: 0.1
                },
                {
                    key: "PlayerCharacterStaminaDrainMultiplier",
                    label: "Stamina Drain",
                    i18n_label: "schema_lbl_stam_drain",
                    type: "number",
                    ini: "GameUserSettings",
                    section: "ServerSettings",
                    default: 1,
                    min: 0.1,
                    max: 10,
                    step: 0.1
                },
                {
                    key: "PlayerCharacterHealthRecoveryMultiplier",
                    label: "Health Recovery",
                    i18n_label: "schema_lbl_health_recov",
                    type: "number",
                    ini: "GameUserSettings",
                    section: "ServerSettings",
                    default: 1,
                    min: 0.1,
                    max: 10,
                    step: 0.1
                }
            ]
        },

        {
            id: "dinos",
            title: "Dino Multipliers",
            i18n_title: "schema_cat_dinos",
            settings: [
                {
                    key: "DinoDamageMultiplier",
                    label: "Dino Damage",
                    i18n_label: "schema_lbl_dino_dmg",
                    type: "number",
                    ini: "GameUserSettings",
                    section: "ServerSettings",
                    default: 1,
                    min: 0.1,
                    max: 10,
                    step: 0.1
                },
                {
                    key: "DinoResistanceMultiplier",
                    label: "Dino Resistance",
                    i18n_label: "schema_lbl_dino_res",
                    type: "number",
                    ini: "GameUserSettings",
                    section: "ServerSettings",
                    default: 1,
                    min: 0.1,
                    max: 10,
                    step: 0.1
                },
                {
                    key: "DinoCharacterFoodDrainMultiplier",
                    label: "Dino Food Drain",
                    i18n_label: "schema_lbl_dino_food",
                    type: "number",
                    ini: "GameUserSettings",
                    section: "ServerSettings",
                    default: 1,
                    min: 0.1,
                    max: 10,
                    step: 0.1
                },
                {
                    key: "DinoCharacterStaminaDrainMultiplier",
                    label: "Dino Stamina Drain",
                    i18n_label: "schema_lbl_dino_stam",
                    type: "number",
                    ini: "GameUserSettings",
                    section: "ServerSettings",
                    default: 1,
                    min: 0.1,
                    max: 10,
                    step: 0.1
                },
                {
                    key: "DinoCharacterHealthRecoveryMultiplier",
                    label: "Dino Health Recovery",
                    i18n_label: "schema_lbl_dino_health",
                    type: "number",
                    ini: "GameUserSettings",
                    section: "ServerSettings",
                    default: 1,
                    min: 0.1,
                    max: 10,
                    step: 0.1
                },
                {
                    key: "DinoHarvestingDamageMultiplier",
                    label: "Dino Harvest Damage",
                    i18n_label: "schema_lbl_dino_harvest",
                    type: "number",
                    ini: "Game",
                    section: "/Script/ShooterGame.ShooterGameMode",
                    default: 1,
                    min: 0.1,
                    max: 10,
                    step: 0.1
                },
                {
                    key: "DinoTurretDamageMultiplier",
                    label: "Dino Turret Damage",
                    i18n_label: "schema_lbl_dino_turret",
                    type: "number",
                    ini: "Game",
                    section: "/Script/ShooterGame.ShooterGameMode",
                    default: 1,
                    min: 0.1,
                    max: 10,
                    step: 0.1
                },
                {
                    key: "bDisableDinoTaming",
                    label: "Disable Dino Taming",
                    i18n_label: "schema_lbl_disable_taming",
                    type: "checkbox",
                    ini: "Game",
                    section: "/Script/ShooterGame.ShooterGameMode",
                    default: false
                },
                {
                    key: "bDisableDinoRiding",
                    label: "Disable Dino Riding",
                    i18n_label: "schema_lbl_disable_riding",
                    type: "checkbox",
                    ini: "Game",
                    section: "/Script/ShooterGame.ShooterGameMode",
                    default: false
                }
            ]
        },

        {
            id: "structures",
            title: "Structures",
            i18n_title: "schema_cat_structures",
            settings: [
                {
                    key: "StructureDamageMultiplier",
                    label: "Structure Damage",
                    i18n_label: "schema_lbl_struct_dmg",
                    type: "number",
                    ini: "GameUserSettings",
                    section: "ServerSettings",
                    default: 1,
                    min: 0.1,
                    max: 10,
                    step: 0.1
                },
                {
                    key: "StructureResistanceMultiplier",
                    label: "Structure Resistance",
                    i18n_label: "schema_lbl_struct_res",
                    type: "number",
                    ini: "GameUserSettings",
                    section: "ServerSettings",
                    default: 1,
                    min: 0.1,
                    max: 10,
                    step: 0.1
                },
                {
                    key: "StructureDamageRepairCooldown",
                    label: "Repair Cooldown",
                    i18n_label: "schema_lbl_repair_cooldown",
                    type: "number",
                    ini: "Game",
                    section: "/Script/ShooterGame.ShooterGameMode",
                    default: 180,
                    min: 0,
                    max: 100000,
                    step: 1
                }
            ]
        }
    ]
};