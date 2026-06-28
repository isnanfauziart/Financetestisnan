const { TwaManifest, TwaGenerator } = require('@bubblewrap/core');
const path = require('path');
const fs = require('fs');

async function generateTwa() {
  const projectDir = path.join(__dirname, '..', 'android');
  const manifestUrl = 'https://financedashv1.vercel.app/manifest.json';
  
  console.log('Fetching manifest from:', manifestUrl);
  
  // Create TWA manifest manually
  const twaManifest = {
    packageId: 'com.artami.app',
    host: 'financedashv1.vercel.app',
    name: 'Artami',
    launcherName: 'Artami',
    display: 'standalone',
    orientation: 'default',
    themeColor: '#9f87ef',
    backgroundColor: '#fdf8f3',
    startUrl: '/dashboard',
    iconUrl: 'https://financedashv1.vercel.app/icons/icon-512.png',
    maskableIconUrl: 'https://financedashv1.vercel.app/icons/icon-512.png',
    monochromeIconUrl: 'https://financedashv1.vercel.app/icons/icon-512.png',
    appVersionCode: 1,
    appVersionName: '1.0.0',
    signingKey: {
      path: path.join(__dirname, '..', 'artami.keystore'),
      alias: 'key0',
    },
    features: {
      locationDelegation: { enabled: false },
      playBilling: { enabled: false },
    },
    enableNotifications: false,
    shortcuts: [],
    generatorApp: 'bubblewrap-cli',
    webManifestUrl: manifestUrl,
    fallbackType: 'customtabs',
    shareTarget: undefined,
    fingerprints: [],
  };

  // Save twa-manifest.json
  const twaManifestPath = path.join(__dirname, '..', 'twa-manifest.json');
  fs.writeFileSync(twaManifestPath, JSON.stringify(twaManifest, null, 2));
  console.log('Created twa-manifest.json');

  // Generate Android project
  console.log('Generating Android project...');
  
  try {
    const manifest = new TwaManifest(twaManifest);
    const generator = new TwaGenerator();
    
    // Create android directory
    if (!fs.existsSync(projectDir)) {
      fs.mkdirSync(projectDir, { recursive: true });
    }
    
    await generator.createTwaProject(projectDir, manifest);
    console.log('Android project generated at:', projectDir);
    console.log('');
    console.log('Next steps:');
    console.log('1. cd android');
    console.log('2. Run: ./gradlew assembleDebug');
    console.log('3. APK will be at: android/app/build/outputs/apk/debug/app-debug.apk');
  } catch (error) {
    console.error('Error generating project:', error.message);
    console.log('');
    console.log('Alternative: Use the twa-manifest.json with Bubblewrap CLI');
    console.log('Run: bubblewrap build --manifest twa-manifest.json');
  }
}

generateTwa().catch(console.error);
