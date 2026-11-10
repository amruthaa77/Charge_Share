import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
let sharp;
try {
  sharp = require('../server/node_modules/sharp');
} catch {
  try {
    sharp = require('sharp');
  } catch (err) {
    console.error('❌ Could not load sharp library:', err.message);
    process.exit(1);
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Default source folder on Windows host, overrideable via BAY_IMAGES_SRC
const srcDir = process.env.BAY_IMAGES_SRC || 'C:\\projects\\ev_charger\\evimages';
const destDir = path.join(projectRoot, 'client', 'public', 'images', 'bays');

// Curated mapping of source files to canonical bay-X names
// 10 distinct, verified electric scooter charging photos (free of car focus)
const IMAGE_MAPPING = [
  {
    name: 'bay-1',
    src: 'Ather 340 & Ather 450 electric scooters launched___.jpg',
    title: 'Ather Seated Scooter Plugged into Wall-Mounted Home Charger',
  },
  {
    name: 'bay-2',
    src: 'Ather 450X Gen 3 With Extended Range, Improved Features Launched_ Price.jpg',
    title: 'Matte Grey Ather 450X at Wall Socket with Ivy Facade',
  },
  {
    name: 'bay-3',
    src: 'ather charging.jpg',
    title: 'White Electric Scooter at Public Bengaluru Ather Grid Kiosk',
  },
  {
    name: 'bay-4',
    src: 'Barcelona impulsa estaciones mixtas para cargar coches y motos eléctricas.jpg',
    title: 'Modern Electric Scooter Plugged into Public Green Charging Pillar',
  },
  {
    name: 'bay-5',
    src: 'CHALO SMART ECO.jpg',
    title: 'Futuristic White and Lime Seated EV Scooter in Clean Tunnel',
  },
  {
    name: 'bay-6',
    src: 'Check out Ola electric scooter in detailed images_ Does Ather 450X have an anticipated contender__.jpg',
    title: 'Matte Black Ola S1 Pro with Signature Twin-Ring LED Headlight',
  },
  {
    name: 'bay-7',
    src: 'Ev scooty.jpg',
    title: 'Navy Blue Commercial Electric Scooter with Protective Crash Guard',
  },
  {
    name: 'bay-8',
    src: 'Honda Activa EV_ A New Era of Electric Mobility in India.jpg',
    title: 'Pearl White Concept Electric Scooter with Blue LED Accent',
  },
  {
    name: 'bay-9',
    src: 'The Industrial Design Evolution of Modern EV Scooters.jpg',
    title: 'Minimalist Matte-Black Electric Scooter Studio Profile',
  },
  {
    name: 'bay-10',
    src: "The impact of government subsidies on  EV's.jpg",
    title: 'Ather 450X Wide Perspective at Gated Villa Wallbox',
  },
];

async function run() {
  console.log('====================================================');
  console.log('⚡ ChargeShare India - Bay Image Import & Optimizer');
  console.log('====================================================\n');
  console.log(`Source Folder : ${srcDir}`);
  console.log(`Target Folder : ${destDir}\n`);

  if (!fs.existsSync(srcDir)) {
    console.warn(`⚠️  Source directory "${srcDir}" was not found.`);
    if (fs.existsSync(destDir)) {
      const existing = fs.readdirSync(destDir).filter((f) => f.startsWith('bay-'));
      if (existing.length > 0) {
        console.log(`✅ Preserving existing ${existing.length} bay images in destination folder.`);
        return;
      }
    }
    console.error('❌ Error: Source directory does not exist and no existing bay images found.');
    process.exit(1);
  }

  // Ensure target folder exists
  fs.mkdirSync(destDir, { recursive: true });

  // Clean out legacy / obsolete stock files in bays folder
  const existingFiles = fs.readdirSync(destDir);
  let cleanedCount = 0;
  for (const f of existingFiles) {
    if (!f.startsWith('bay-')) {
      const full = path.join(destDir, f);
      try {
        fs.unlinkSync(full);
        cleanedCount++;
      } catch (err) {
        console.warn(`Could not delete legacy file ${f}:`, err.message);
      }
    }
  }
  if (cleanedCount > 0) {
    console.log(`🧹 Cleaned up ${cleanedCount} legacy/unused files from ${destDir}\n`);
  }

  console.log('Optimizing & Converting to WebP (16:9 Center-Crop, Metadata Stripped):');
  console.log('----------------------------------------------------------------------');

  const manifest = [];

  for (let i = 0; i < IMAGE_MAPPING.length; i++) {
    const item = IMAGE_MAPPING[i];
    const srcPath = path.join(srcDir, item.src);

    if (!fs.existsSync(srcPath)) {
      console.warn(`⚠️  File not found: ${item.src}, skipping.`);
      continue;
    }

    const heroName = `${item.name}.webp`;
    const thumbName = `${item.name}-thumb.webp`;
    const heroDest = path.join(destDir, heroName);
    const thumbDest = path.join(destDir, thumbName);

    // 1. Hero Image: 1200x675 (16:9), WebP quality 82, metadata stripped
    await sharp(srcPath)
      .rotate() // Auto-orient based on EXIF before stripping
      .resize(1200, 675, {
        fit: 'cover',
        position: 'center',
      })
      .webp({ quality: 82, effort: 4 })
      .toFile(heroDest);

    // 2. Thumbnail: 480x270 (16:9), WebP quality 80, metadata stripped
    await sharp(srcPath)
      .rotate()
      .resize(480, 270, {
        fit: 'cover',
        position: 'center',
      })
      .webp({ quality: 80, effort: 4 })
      .toFile(thumbDest);

    const heroStat = fs.statSync(heroDest);
    const thumbStat = fs.statSync(thumbDest);

    console.log(
      `✓ ${item.name.padEnd(7)} | Hero: ${(heroStat.size / 1024).toFixed(1)} KB (1200x675) | Thumb: ${(
        thumbStat.size / 1024
      ).toFixed(1)} KB (480x270) | ${item.title}`
    );

    manifest.push({
      id: item.name,
      title: item.title,
      src: `/images/bays/${heroName}`,
      thumbnail: `/images/bays/${thumbName}`,
      aspectRatio: '16:9',
      width: 1200,
      height: 675,
      thumbWidth: 480,
      thumbHeight: 270,
    });
  }

  // Write image manifest to client public directory
  const manifestPath = path.join(projectRoot, 'client', 'public', 'images', 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
  console.log(`\n📄 Generated image manifest: ${manifestPath}`);

  console.log('\n====================================================');
  console.log(`🎉 Successfully imported and optimized ${manifest.length} bay images!`);
  console.log('====================================================\n');
}

run().catch((err) => {
  console.error('Fatal error during bay image import:', err);
  process.exit(1);
});
