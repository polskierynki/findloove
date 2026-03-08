const sharp = require('sharp');
const path = require('path');

async function createFavicons() {
  try {
    const logoPath = path.join(__dirname, '../public/logo/favico.jpg');
    const outputDir = path.join(__dirname, '../public');
    
    // Create different sizes for favicon
    const sizes = [16, 32, 48, 96, 192, 512];
    
    for (const size of sizes) {
      await sharp(logoPath)
        .resize(size, size, {
          fit: 'cover',
          position: 'center'
        })
        .png()
        .toFile(path.join(outputDir, `favicon-${size}x${size}.png`));
      console.log(`✓ Created favicon-${size}x${size}.png`);
    }
    
    // Create the main favicon.ico (32x32)
    await sharp(logoPath)
      .resize(32, 32, {
        fit: 'cover',
        position: 'center'
      })
      .toFile(path.join(outputDir, 'favicon.ico'));
    console.log('✓ Created favicon.ico');
    
    // Create apple-touch-icon
    await sharp(logoPath)
      .resize(180, 180, {
        fit: 'cover',
        position: 'center'
      })
      .png()
      .toFile(path.join(outputDir, 'apple-touch-icon.png'));
    console.log('✓ Created apple-touch-icon.png');
    
    console.log('\n✅ All favicons created successfully!');
  } catch (error) {
    console.error('❌ Error creating favicons:', error);
    process.exit(1);
  }
}

createFavicons();
