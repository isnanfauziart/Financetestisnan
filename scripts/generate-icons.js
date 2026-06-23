const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const svgPath = path.join(__dirname, '..', 'public', 'icons', 'icon.svg');
const outputDir = path.join(__dirname, '..', 'public', 'icons');

const sizes = [
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
];

async function generate() {
  if (!fs.existsSync(svgPath)) {
    console.error('SVG not found at', svgPath);
    process.exit(1);
  }

  for (const { name, size } of sizes) {
    const out = path.join(outputDir, name);
    await sharp(svgPath)
      .resize(size, size)
      .png()
      .toFile(out);
    console.log(`Created ${out} (${size}x${size})`);
  }
  console.log('Done!');
}

generate().catch(err => { console.error(err); process.exit(1); });
