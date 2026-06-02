#!/bin/bash

# ==============================================================================
# Tuxruku ASA Manager (TAM) - Guided Auto-Installer for Ubuntu/Debian
# ==============================================================================

echo "==========================================================="
echo " 🐧 Welcome to the Tuxruku ASA Manager Installer 🦖 "
echo "==========================================================="
echo ""

# 1. Check root permissions
if [ "$EUID" -ne 0 ]; then
  echo "❌ Error: Please run this script as root."
  echo "Try command: sudo ./install.sh"
  exit
fi

echo "This script will:"
echo " 1. Create a dedicated Linux user called 'tuxruku'"
echo " 2. Install Node.js, Wine, Xvfb, Vulkan/Mesa, and SteamCMD dependencies"
echo " 3. Setup PM2 (Process Manager) for background running"
echo " 4. Install the Tuxruku Web Panel"
echo ""
read -p "Press [ENTER] to begin the installation or [CTRL+C] to cancel..."

# 2. Create the tuxruku system user
echo -e "\n[1/4] 👤 Creating user 'tuxruku'..."
if id "tuxruku" &>/dev/null; then
    echo "User 'tuxruku' already exists. Skipping."
else
    useradd -m -s /bin/bash tuxruku
    echo "User created successfully."
fi

# 3. Install OS Dependencies (Wine, Xvfb, Unzip, SteamCMD libs, Vulkan/Mesa graphics)
echo -e "\n[2/4] 📦 Installing System Dependencies (This might take a while)..."
dpkg --add-architecture i386
apt-get update
apt-get install -y curl wget git unzip tar xvfb wine64 wine32 lib32gcc-s1 software-properties-common winbind mesa-utils libgl1-mesa-dri mesa-vulkan-drivers vulkan-tools winetricks cabextract libvulkan1 python3

# 4. Install Node.js (Version 20)
echo -e "\n[3/4] 🟢 Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# 5. Install SteamCMD directly into tuxruku's home folder
echo -e "\n[4/4] 🎮 Installing SteamCMD & TAM Web Panel..."
su - tuxruku -c "mkdir -p /home/tuxruku/steamcmd"
su - tuxruku -c "curl -sqL 'https://steamcdn-a.akamaihd.net/client/installer/steamcmd_linux.tar.gz' | tar zxvf - -C /home/tuxruku/steamcmd"

# 6. Clone the repository
echo -e "\n📥 Downloading Tuxruku ASA Manager..."
su - tuxruku -c "git clone https://github.com/ITzHandal/Tuxruku.git /home/tuxruku/asa-manager"

# 7. Install NPM packages and PM2
echo -e "\n⚙️ Installing Node modules..."
su - tuxruku -c "cd /home/tuxruku/asa-manager && npm install"
npm install -g pm2

# 8. Finished!
echo "==========================================================="
echo " 🎉 INSTALLATION COMPLETE! 🎉"
echo "==========================================================="
echo ""
echo "To start your panel, switch to the tuxruku user and launch PM2:"
echo ""
echo "  sudo su - tuxruku"
echo "  cd ~/asa-manager"
echo "  pm2 start server.js --name 'TAM-Core'"
echo "  pm2 save"
echo "  pm2 startup"
echo ""
echo "Then open your browser and go to: http://YOUR_SERVER_IP:8686"
echo "==========================================================="