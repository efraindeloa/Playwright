const fs = require('fs');
const path = require('path');

// Directorio donde se guardarán los archivos de prueba
const testImagesDir = path.join(__dirname);

// Función para crear un PNG válido de 1x1 pixel rojo (base64 de PNG real)
function createPNG() {
  // PNG válido de 1x1 pixel rojo en base64
  const validPNGBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  return Buffer.from(validPNGBase64, 'base64');
}

// Función para crear un JPEG válido básico
function createValidJPEG() {
  // JPEG válido mínimo de 1x1 pixel
  const validJPEGBase64 = '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A8A';
  return Buffer.from(validJPEGBase64, 'base64');
}

// Función para crear un GIF válido
function createValidGIF() {
  // GIF válido de 1x1 pixel
  const validGIFBase64 = 'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
  return Buffer.from(validGIFBase64, 'base64');
}

// Función para crear un WebP válido
function createValidWebP() {
  // WebP válido mínimo
  const validWebPBase64 = 'UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAwA0JaQAA3AA/vuUAAA=';
  return Buffer.from(validWebPBase64, 'base64');
}

// Crear archivos de prueba para cada formato
const imageFormats = [
  { ext: '.jpg', name: 'test-image', createFn: createValidJPEG },
  { ext: '.jpeg', name: 'test-image', createFn: createValidJPEG },
  { ext: '.png', name: 'test-image', createFn: createPNG },
  { ext: '.gif', name: 'test-image', createFn: createValidGIF },
  { ext: '.webp', name: 'test-image', createFn: createValidWebP },
  { ext: '.bmp', name: 'test-image', createFn: () => {
    // BMP mínimo válido: 1x1 pixel
    const bmp = Buffer.alloc(66);
    bmp.write('BM', 0);
    bmp.writeUInt32LE(66, 2); // file size
    bmp.writeUInt32LE(54, 10); // offset to pixel data
    bmp.writeUInt32LE(40, 14); // DIB header size
    bmp.writeInt32LE(1, 18); // width
    bmp.writeInt32LE(1, 22); // height
    bmp.writeUInt16LE(1, 26); // color planes
    bmp.writeUInt16LE(24, 28); // bits per pixel
    return bmp;
  }},
  { ext: '.svg', name: 'test-image', createFn: () => {
    return Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="red"/></svg>', 'utf8');
  }},
  { ext: '.ico', name: 'test-image', createFn: () => {
    // ICO válido usando PNG embebido (más compatible)
    const pngData = createPNG();
    const ico = Buffer.alloc(22 + pngData.length);
    ico.writeUInt16LE(0, 0);
    ico.writeUInt16LE(1, 2);
    ico.writeUInt16LE(1, 4);
    ico.writeUInt8(16, 6); // width
    ico.writeUInt8(16, 7); // height
    ico.writeUInt8(0, 8);
    ico.writeUInt8(0, 9);
    ico.writeUInt16LE(1, 10);
    ico.writeUInt16LE(32, 12);
    ico.writeUInt32LE(pngData.length, 14);
    ico.writeUInt32LE(22, 18);
    pngData.copy(ico, 22);
    return ico;
  }},
  { ext: '.tif', name: 'test-image', createFn: createPNG }, // TIFF es complejo, usar PNG
  { ext: '.tiff', name: 'test-image', createFn: createPNG },
  { ext: '.jfif', name: 'test-image', createFn: createValidJPEG },
  { ext: '.pjp', name: 'test-image', createFn: createValidJPEG },
  { ext: '.apng', name: 'test-image', createFn: createPNG }, // APNG es similar a PNG
  { ext: '.heif', name: 'test-image', createFn: createPNG }, // HEIF es complejo, usar PNG
  { ext: '.heic', name: 'test-image', createFn: createPNG },
  { ext: '.svgz', name: 'test-image', createFn: () => {
    // SVGZ es SVG comprimido, usar SVG normal (sin comprimir)
    return Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="red"/></svg>', 'utf8');
  }},
  { ext: '.pjpeg', name: 'test-image', createFn: createValidJPEG },
  { ext: '.avif', name: 'test-image', createFn: createPNG }, // AVIF es complejo, usar PNG
  { ext: '.xbm', name: 'test-image', createFn: () => {
    // XBM es un formato de texto, crear archivo válido
    return Buffer.from('#define test_width 10\n#define test_height 10\nstatic unsigned char test_bits[] = {\n0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,\n0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF\n};', 'utf8');
  }}
];

// Crear los archivos
console.log('📁 Creando archivos de prueba para formatos de imagen...');

imageFormats.forEach(format => {
  try {
    const fileName = `${format.name}${format.ext}`;
    const filePath = path.join(testImagesDir, fileName);
    const fileData = format.createFn();
    fs.writeFileSync(filePath, fileData);
    console.log(`✅ Creado: ${fileName} (${fileData.length} bytes)`);
  } catch (error) {
    console.error(`❌ Error al crear ${format.name}${format.ext}:`, error.message);
  }
});

console.log('\n✅ Archivos de prueba creados exitosamente');

