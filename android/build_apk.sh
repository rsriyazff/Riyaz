#!/bin/bash

# ==========================================
# 📱 ZOYA AI - AUTOMATED APK BUILDER (macOS/Linux)
# ==========================================

clear
echo "=================================================="
echo "      🌌 ZOYA AI - AUTOMATED APK BUILDER 🌌       "
echo "=================================================="
echo ""

# 1. Check for Java
echo "🔍 Checking Java Environment..."
if ! command -v java &> /dev/null; then
    echo "❌ Error: Java (JDK) is not installed on your system."
    echo "💡 Please install JDK 17 or higher: https://adoptium.net/"
    exit 1
else
    echo "✔ Java is installed: $(java -version 2>&1 | head -n 1)"
fi
echo ""

# 2. Setup Gradle Wrapper if not exists
echo "🔍 Checking Gradle Wrapper..."
if [ ! -f "./gradlew" ]; then
    echo "📦 Initializing local Gradle wrapper..."
    if command -v gradle &> /dev/null; then
        gradle wrapper
    else
        echo "⚠️ Note: Local 'gradle' command not found."
        echo "💡 Don't worry! Open this folder in Android Studio and it will set up everything automatically."
        echo "📂 Folder to open: $(pwd)"
        read -p "Press ENTER to exit..."
        exit 0
    fi
fi

# 3. Build APK
echo "🚀 Building Zoya AI Debug APK..."
chmod +x ./gradlew
./gradlew assembleDebug

if [ $? -eq 0 ]; then
    echo ""
    echo "=================================================="
    echo "🎉 SUCCESS: Zoya AI APK Generated Successfully!"
    echo "=================================================="
    echo "📂 Find your APK file here:"
    echo "   $(pwd)/app/build/outputs/apk/debug/app-debug.apk"
    echo "=================================================="
else
    echo ""
    echo "❌ Build failed. Please open this directory in Android Studio to sync dependencies and build."
fi

read -p "Press ENTER to close..."
