# 📱 How to Build the Zoya AI APK (Zoya AI APK Kaise Build Karein)

Because the cloud preview environment runs in a highly secure, sandboxed container, it only permits web servers and has strict restrictions on running heavy background compiling systems like Gradle or the Android SDK (the `gradle` command is blocked in the cloud container). 

Therefore, you must build the APK locally on your computer. Follow this super-easy 5-minute guide to compile and get your APK!

---

## 🛠️ Requirements
1. **Java Development Kit (JDK)** installed on your PC.
2. **Android Studio** (or the command line Gradle tool).

---

## 🚀 Step-by-Step Guide (English)

### Step 1: Export Your Project Codebase
1. Open the **Settings Menu** (Gear icon) on top of the AI Studio workspace.
2. Click on **Export to GitHub** or **Download ZIP** to save the entire source code to your computer.
3. Extract the downloaded ZIP file to a folder on your computer.

### Step 2: Open in Android Studio
1. Launch **Android Studio**.
2. Click **Open** (or File -> Open) and select the `android` folder inside your extracted project.
3. Let Android Studio sync the project and download Gradle dependencies (this takes 1-2 minutes).

### Step 3: Build the APK
1. In the top menu bar of Android Studio, click **Build**.
2. Select **Build Bundle(s) / APK(s)** -> **Build APK(s)**.
3. Android Studio will compile your code and generate the `.apk` file.

### Step 4: Locate Your APK
1. Once compilation finishes, a popup will appear at the bottom right corner of Android Studio saying "APK(s) generated successfully".
2. Click on the **locate** link inside that popup.
3. Alternatively, you can find your APK file at:
   `android/app/build/outputs/apk/debug/app-debug.apk`

---

## 🇮🇳 आसान हिंदी गाइड (Hinglish)

### स्टेप 1: कोड को अपने कंप्यूटर पर डाउनलोड करें
1. AI Studio में ऊपर दिए गए **Settings Menu** (गियर आइकॉन) पर क्लिक करें।
2. **Download ZIP** या **Export to GitHub** पर क्लिक करके पूरे कोड को अपने कंप्यूटर पर सेव कर लें।
3. डाउनलोड की हुई ZIP फाइल को अपने कंप्यूटर पर एक्सट्रैक्ट (Unzip) करें।

### स्टेप 2: प्रोजेक्ट को Android Studio में खोलें
1. अपने कंप्यूटर पर **Android Studio** को खोलें।
2. **Open** पर क्लिक करें और एक्सट्रैक्ट किए गए फोल्डर के अंदर मौजूद `android` फोल्डर को सेलेक्ट करें।
3. Android Studio को फाइलें सिंक करने दें (इसमें 1 से 2 मिनट का समय लगेगा)।

### स्टेप 3: APK फाइल जनरेट करें
1. Android Studio के टॉप मेन्यू में **Build** विकल्प पर क्लिक करें।
2. **Build Bundle(s) / APK(s)** -> **Build APK(s)** सेलेक्ट करें।
3. आपका APK बनना शुरू हो जाएगा।

### स्टेप 4: APK डाउनलोड करें
1. बिल्ड पूरा होने के बाद नीचे दाईं तरफ एक नोटिफिकेशन आएगा जिसमें लिखा होगा "APK(s) generated successfully"।
2. वहां **locate** लिंक पर क्लिक करें। आपका फोल्डर खुल जाएगा और आपको **app-debug.apk** मिल जाएगा!
3. आप इस डायरेक्टरी में भी ढूंढ सकते हैं:
   `android/app/build/outputs/apk/debug/app-debug.apk`
