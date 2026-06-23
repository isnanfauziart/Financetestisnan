# Artoku Android TWA - Build Instructions

## Prerequisites

1. **Android Studio** (installed via winget)
   - Open Android Studio
   - Go to Tools → SDK Manager
   - Install Android SDK 34 (or latest)
   - Note the SDK path shown at the top

2. **Java JDK 21** (already installed)

## Build Steps

### Option 1: Build with Android Studio (Recommended)

1. Open Android Studio
2. Click "Open an existing Android Studio project"
3. Navigate to `C:\TITIP\financeapptesting\android`
4. Wait for Gradle sync to complete
5. Click Build → Build Bundle(s) / APK(s) → Build APK(s)
6. APK will be at: `android/app/build/outputs/apk/debug/app-debug.apk`

### Option 2: Build with Command Line

1. First, update `local.properties` with your SDK path:
   ```
   sdk.dir=C:\\Users\\acer\\AppData\\Local\\Android\\Sdk
   ```

2. Open a new PowerShell window (to get updated PATH)

3. Run:
   ```powershell
   cd C:\TITIP\financeapptesting\android
   .\gradlew.bat assembleDebug
   ```

4. APK will be at: `android\app\build\outputs\apk\debug\app-debug.apk`

## Install on Device

### Via ADB (USB)
```powershell
adb install app-debug.apk
```

### Via File Transfer
1. Copy `app-debug.apk` to your phone
2. Open the file on your phone
3. Tap "Install" when prompted
4. Enable "Install unknown apps" if needed

## Troubleshooting

### "SDK location not found"
- Update `android/local.properties` with correct SDK path
- Or set `ANDROID_HOME` environment variable

### "JAVA_HOME is not set"
```powershell
$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-21.0.11.10-hotspot"
```

### Build fails with "Could not resolve..."
- Check internet connection
- Gradle needs to download dependencies

## Project Structure

```
android/
├── app/
│   ├── build.gradle          # App build config
│   └── src/main/
│       ├── AndroidManifest.xml
│       ├── java/com/artoku/app/
│       │   └── MainActivity.java
│       └── res/
│           ├── drawable/     # Splash screen
│           ├── mipmap-*/     # App icons
│           └── values/       # Colors, strings, styles
├── build.gradle              # Root build config
├── gradle/                   # Gradle wrapper
├── gradlew.bat               # Windows build script
└── local.properties          # SDK location
```
