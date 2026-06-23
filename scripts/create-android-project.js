const path = require('path');
const fs = require('fs');

// Minimal Android project structure for TWA
const projectDir = path.join(__dirname, '..', 'android');

function createDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function writeFile(filePath, content) {
  createDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content);
}

console.log('Creating Android TWA project...');

// Create directory structure
createDir(projectDir);
createDir(path.join(projectDir, 'app', 'src', 'main', 'java', 'com', 'artoku', 'app'));
createDir(path.join(projectDir, 'app', 'src', 'main', 'res', 'values'));
createDir(path.join(projectDir, 'app', 'src', 'main', 'res', 'mipmap-hdpi'));
createDir(path.join(projectDir, 'app', 'src', 'main', 'res', 'mipmap-mdpi'));
createDir(path.join(projectDir, 'app', 'src', 'main', 'res', 'mipmap-xhdpi'));
createDir(path.join(projectDir, 'app', 'src', 'main', 'res', 'mipmap-xxhdpi'));
createDir(path.join(projectDir, 'app', 'src', 'main', 'res', 'mipmap-xxxhdpi'));
createDir(path.join(projectDir, 'app', 'src', 'main', 'res', 'drawable'));
createDir(path.join(projectDir, 'app', 'src', 'main', 'res', 'xml'));
createDir(path.join(projectDir, 'gradle', 'wrapper'));

// Root build.gradle
writeFile(path.join(projectDir, 'build.gradle'), `buildscript {
    repositories {
        google()
        mavenCentral()
    }
    dependencies {
        classpath 'com.android.tools.build:gradle:8.2.2'
    }
}

allprojects {
    repositories {
        google()
        mavenCentral()
    }
}

task clean(type: Delete) {
    delete rootProject.buildDir
}
`);

// App build.gradle
writeFile(path.join(projectDir, 'app', 'build.gradle'), `plugins {
    id 'com.android.application'
}

android {
    namespace 'com.artoku.app'
    compileSdk 34

    defaultConfig {
        applicationId "com.artoku.app"
        minSdk 24
        targetSdk 34
        versionCode 1
        versionName "1.0.0"
    }

    buildTypes {
        release {
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }

    compileOptions {
        sourceCompatibility JavaVersion.VERSION_1_8
        targetCompatibility JavaVersion.VERSION_1_8
    }
}

dependencies {
    implementation 'androidx.browser:browser:1.7.0'
    implementation 'androidx.core:core:1.12.0'
}
`);

// AndroidManifest.xml
writeFile(path.join(projectDir, 'app', 'src', 'main', 'AndroidManifest.xml'), `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="Artoku"
        android:supportsRtl="true"
        android:theme="@style/AppTheme">

        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:theme="@style/AppTheme">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
            <intent-filter android:autoVerify="true">
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="https" android:host="financedashv1.vercel.app" />
            </intent-filter>
            <meta-data
                android:name="android.support.customtabs.trusted.DEFAULT_URL"
                android:value="https://financedashv1.vercel.app/dashboard" />
            <meta-data
                android:name="android.support.customtabs.trusted.SPLASH_IMAGE_DRAWABLE"
                android:resource="@drawable/splash" />
            <meta-data
                android:name="android.support.customtabs.trusted.SPLASH_SCREEN_BACKGROUND_COLOR"
                android:resource="@color/splashScreenBackground" />
            <meta-data
                android:name="android.support.customtabs.trusted.SPLASH_SCREEN_FADE_OUT_DURATION"
                android:value="300" />
            <meta-data
                android:name="android.support.customtabs.trusted.NAVIGATION_BAR_COLOR"
                android:resource="@color/navigationBarColor" />
            <meta-data
                android:name="android.support.customtabs.trusted.STATUS_BAR_COLOR"
                android:resource="@color/statusBarColor" />
        </activity>

        <provider
            android:name="androidx.startup.InitializationProvider"
            android:authorities="\${applicationId}.androidx-startup"
            android:exported="false"
            tools:node="merge">
            <meta-data
                android:name="androidx.work.WorkManagerInitializer"
                android:value="androidx.startup"
                tools:node="remove" />
        </provider>
    </application>
</manifest>
`);

// MainActivity.java
writeFile(path.join(projectDir, 'app', 'src', 'main', 'java', 'com', 'artoku', 'app', 'MainActivity.java'), `package com.artoku.app;

import android.net.Uri;
import android.os.Bundle;
import androidx.appcompat.app.AppCompatActivity;
import androidx.browser.customtabs.CustomTabsIntent;

public class MainActivity extends AppCompatActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        String url = "https://financedashv1.vercel.app/dashboard";
        
        CustomTabsIntent.Builder builder = new CustomTabsIntent.Builder();
        builder.setShowTitle(true);
        builder.setUrlBarHidingEnabled(true);
        
        CustomTabsIntent customTabsIntent = builder.build();
        customTabsIntent.launchUrl(this, Uri.parse(url));
        
        finish();
    }
}
`);

// Colors
writeFile(path.join(projectDir, 'app', 'src', 'main', 'res', 'values', 'colors.xml'), `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="splashScreenBackground">#fdf8f3</color>
    <color name="statusBarColor">#9f87ef</color>
    <color name="navigationBarColor">#fdf8f3</color>
    <color name="colorPrimary">#9f87ef</color>
    <color name="colorPrimaryDark">#7c5fcf</color>
    <color name="colorAccent">#d4a853</color>
</resources>
`);

// Strings
writeFile(path.join(projectDir, 'app', 'src', 'main', 'res', 'values', 'strings.xml'), `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">Artoku</string>
</resources>
`);

// Styles
writeFile(path.join(projectDir, 'app', 'src', 'main', 'res', 'values', 'styles.xml'), `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="AppTheme" parent="Theme.AppCompat.Light.NoActionBar">
        <item name="colorPrimary">@color/colorPrimary</item>
        <item name="colorPrimaryDark">@color/colorPrimaryDark</item>
        <item name="colorAccent">@color/colorAccent</item>
    </style>
</resources>
`);

// Copy icon as splash drawable (placeholder)
writeFile(path.join(projectDir, 'app', 'src', 'main', 'res', 'drawable', 'splash.xml'), `<?xml version="1.0" encoding="utf-8"?>
<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
    <item android:drawable="@color/splashScreenBackground" />
    <item android:gravity="center" android:width="128dp" android:height="128dp">
        <shape android:shape="oval">
            <solid android:color="#9f87ef" />
        </shape>
    </item>
</layer-list>
`);

// Network security config
writeFile(path.join(projectDir, 'app', 'src', 'main', 'res', 'xml', 'network_security_config.xml'), `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <domain-config cleartextTrafficPermitted="false">
        <domain includeSubdomains="true">financedashv1.vercel.app</domain>
    </domain-config>
</network-security-config>
`);

// gradle.properties
writeFile(path.join(projectDir, 'gradle.properties'), `org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8
android.useAndroidX=true
android.enableJetifier=true
`);

// settings.gradle
writeFile(path.join(projectDir, 'settings.gradle'), `rootProject.name = "Artoku"
include ':app'
`);

// gradle wrapper
writeFile(path.join(projectDir, 'gradle', 'wrapper', 'gradle-wrapper.properties'), `distributionBase=GRADLE_USER_HOME
distributionPath=wrapper/dists
distributionUrl=https\://services.gradle.org/distributions/gradle-8.5-bin.zip
zipStoreBase=GRADLE_USER_HOME
zipStorePath=wrapper/dists
`);

// proguard-rules.pro
writeFile(path.join(projectDir, 'app', 'proguard-rules.pro'), `# Add project specific ProGuard rules here.
`);

console.log('Android project created at:', projectDir);
console.log('');
console.log('Next steps:');
console.log('1. Copy icon PNGs to res/mipmap-* directories');
console.log('2. cd android');
console.log('3. Run: gradlew assembleDebug');
console.log('4. APK will be at: android/app/build/outputs/apk/debug/app-debug.apk');
