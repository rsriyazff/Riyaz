# 📱 Android Mobile Par APK Kaise Banayein (Without PC/Laptop)

Agar aapke paas computer ya laptop nahi hai, toh chinta mat kijiye! Aap apne Android mobile phone ka istemal karke hi **Zoya AI APK** ko bilkul free mein build aur download kar sakte hain.

Humne aapke project ke andar ek **Auto-Build GitHub Workflow** (`.github/workflows/android.yml`) set up kar diya hai. Iska istemal karke aap bina kisi coding ya PC ke direct apne phone par APK download kar sakte hain!

---

## 🚀 Tarika 1: GitHub Actions Se Direct Mobile Pe Download Karein (Sabse Asaan Aur Free)

GitHub ek free service deta hai jahan unka cloud server aapke liye APK build karega, aur aap use direct apne mobile mein install kar payenge.

### Step 1: Project ko GitHub par Export karein
1. AI Studio ke top-right bar mein **Settings (Gear icon)** par click karein.
2. **Export to GitHub** par click karke apne GitHub account ko link karein aur ek naya repository banakar usme is project ko upload kar dein.

### Step 2: Auto-Build Shuru Hoga
Jaise hi aap GitHub par project export karenge, GitHub Actions automatic APK banana shuru kar dega:
1. Apne mobile ke Chrome browser mein apni GitHub Repository kholein.
2. Desktop site view enable karein ya upar **Actions** tab par click karein.
3. Aapko ek workflow run dikhega jiska naam hoga **"Build Android APK"**.

### Step 3: APK Download Karein
1. Workflow build complete hone ka wait karein (lagbhag 2-3 minute).
2. Green checkmark (`✔`) aane ke baad, us build par click karein.
3. Sabse niche **Artifacts** section mein aapko **`zoya-ai-debug-apk`** namak zip file milegi.
4. Use download karke extract karein, uske andar aapko **`app-debug.apk`** mil jayega! Isko direct apne phone mein install kar lein.

---

## 💻 Tarika 2: Termux App Se Apne Phone Par Build Karein (For Advanced Users)

Agar aap apne phone ke andar hi command line se build karna chahte hain:

1. Google Play Store ya F-Droid se **Termux** app download karein.
2. Termux mein niche diye gaye commands ek-ek karke run karein:
   ```bash
   # Termux update karein
   pkg update && pkg upgrade -y
   
   # Git aur Java-17 install karein
   pkg install git openjdk-17 -y
   
   # Storage permission dein
   termux-setup-storage
   
   # Apne project folder mein jayein (agar ZIP download kiya hai toh)
   cd /sdcard/Download/Zoya-Project/android
   
   # Build command run karein
   chmod +x gradlew
   ./gradlew assembleDebug
   ```
3. Build complete hone par aapke phone ke file manager mein is path par APK mil jayega:
   `android/app/build/outputs/apk/debug/app-debug.apk`

---

## 📦 Tarika 3: Android Apps Ka Istemal Karein
Aap Play Store se **"AIDE - IDE for Android"** download karke is `android` folder ko usme open kar sakte hain. AIDE app directly aapke phone par project ko compile karke APK install kar deta hai.
