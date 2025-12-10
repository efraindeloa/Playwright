const fs = require('fs');
const path = require('path');

// Directorio donde se guardarán los archivos de prueba
const testImagesDir = path.join(__dirname);

// Función para crear un MP4 válido mínimo (ftyp box + mdat box vacío)
function createMP4() {
  // MP4 mínimo válido con ftyp box
  const buffer = Buffer.alloc(32);
  // Box size (32 bytes)
  buffer.writeUInt32BE(32, 0);
  // Box type: 'ftyp'
  buffer.write('ftyp', 4);
  // Major brand: 'isom'
  buffer.write('isom', 8);
  // Minor version
  buffer.writeUInt32BE(0, 12);
  // Compatible brands: 'isom', 'iso2', 'avc1', 'mp41'
  buffer.write('isom', 16);
  buffer.write('iso2', 20);
  buffer.write('avc1', 24);
  buffer.write('mp41', 28);
  return buffer;
}

// Función para crear un MOV válido mínimo (QuickTime format, similar a MP4)
function createMOV() {
  // MOV es básicamente MP4 con diferentes brand
  const buffer = Buffer.alloc(32);
  buffer.writeUInt32BE(32, 0);
  buffer.write('ftyp', 4);
  buffer.write('qt  ', 8); // QuickTime brand
  buffer.writeUInt32BE(0, 12);
  buffer.write('qt  ', 16);
  return buffer;
}

// Función para crear un AVI válido mínimo
function createAVI() {
  // AVI mínimo válido con RIFF header
  const buffer = Buffer.alloc(64);
  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(56, 4); // File size - 8
  buffer.write('AVI ', 8);
  // LIST chunk
  buffer.write('LIST', 12);
  buffer.writeUInt32LE(48, 16); // Chunk size
  buffer.write('hdrl', 20);
  // avih chunk
  buffer.write('avih', 24);
  buffer.writeUInt32LE(56, 28); // Chunk size
  buffer.writeUInt32LE(1000000, 32); // Microseconds per frame
  buffer.writeUInt32LE(0, 36); // Max bytes per second
  buffer.writeUInt32LE(0, 40); // Padding granularity
  buffer.writeUInt32LE(0, 44); // Flags
  buffer.writeUInt32LE(0, 48); // Total frames
  buffer.writeUInt32LE(0, 52); // Initial frames
  buffer.writeUInt32LE(1, 56); // Streams
  buffer.writeUInt32LE(0, 60); // Suggested buffer size
  return buffer;
}

// Función para crear un MKV válido mínimo (Matroska)
function createMKV() {
  // MKV mínimo válido con EBML header
  const buffer = Buffer.alloc(64);
  // EBML Header
  buffer[0] = 0x1A; // EBML ID
  buffer[1] = 0x45;
  buffer[2] = 0xDF;
  buffer[3] = 0xA3;
  buffer[4] = 0x84; // Size
  buffer[5] = 0x42;
  buffer[6] = 0x86;
  buffer[7] = 0x81;
  buffer[8] = 0x01; // EBML Version
  buffer[9] = 0x42;
  buffer[10] = 0xF7;
  buffer[11] = 0x81;
  buffer[12] = 0x01; // EBML Read Version
  buffer[13] = 0x42;
  buffer[14] = 0xF2;
  buffer[15] = 0x81;
  buffer[16] = 0x04; // EBML Max ID Length
  buffer[17] = 0x42;
  buffer[18] = 0xF3;
  buffer[19] = 0x81;
  buffer[20] = 0x08; // EBML Max Size Length
  // Resto con ceros
  return buffer;
}

// Función para crear un WMV válido mínimo (ASF format)
function createWMV() {
  // WMV/ASF mínimo válido
  const buffer = Buffer.alloc(80);
  // ASF Header Object
  buffer.write('30', 0, 2, 'hex'); // Object ID (GUID)
  buffer.writeUInt32LE(80, 16); // Object Size
  buffer.writeUInt32LE(0, 20); // Number of Header Objects
  buffer.writeUInt8(1, 24); // Reserved 1
  buffer.writeUInt8(2, 25); // Reserved 2
  return buffer;
}

// Función para crear un FLV válido mínimo
function createFLV() {
  // FLV header mínimo
  const buffer = Buffer.alloc(13);
  buffer.write('FLV', 0); // Signature
  buffer[3] = 0x01; // Version
  buffer[4] = 0x05; // Flags (audio + video)
  buffer.writeUInt32BE(9, 5); // Header size
  buffer.writeUInt32BE(0, 9); // Previous tag size
  return buffer;
}

// Función para crear un WebM válido mínimo (similar a MKV)
function createWebM() {
  // WebM es básicamente MKV con diferentes codec
  const buffer = Buffer.alloc(64);
  // EBML Header (similar a MKV)
  buffer[0] = 0x1A;
  buffer[1] = 0x45;
  buffer[2] = 0xDF;
  buffer[3] = 0xA3;
  buffer[4] = 0x84;
  buffer[5] = 0x42;
  buffer[6] = 0x86;
  buffer[7] = 0x81;
  buffer[8] = 0x01;
  return buffer;
}

// Función para crear un M4V válido mínimo (similar a MP4)
function createM4V() {
  // M4V es básicamente MP4
  return createMP4();
}

// Función para crear un 3GP válido mínimo (similar a MP4)
function create3GP() {
  // 3GP es básicamente MP4 con diferentes brand
  const buffer = Buffer.alloc(32);
  buffer.writeUInt32BE(32, 0);
  buffer.write('ftyp', 4);
  buffer.write('3gp4', 8); // 3GP brand
  buffer.writeUInt32BE(0, 12);
  buffer.write('3gp4', 16);
  return buffer;
}

// Función para crear un OGV válido mínimo (Ogg Theora)
function createOGV() {
  // OGG mínimo válido
  const buffer = Buffer.alloc(64);
  buffer.write('OggS', 0); // Ogg signature
  buffer[4] = 0x00; // Version
  buffer[5] = 0x00; // Header type
  buffer.writeUInt32LE(0, 6); // Granule position
  buffer.writeUInt32LE(0, 10); // Serial number
  buffer.writeUInt32LE(0, 14); // Page sequence number
  buffer.writeUInt32LE(0, 18); // Checksum
  buffer[22] = 0x01; // Page segments
  return buffer;
}

// Crear archivos de video
const videoFormats = [
  { ext: '.mp4', name: 'test-image', createFn: createMP4 },
  { ext: '.mov', name: 'test-image', createFn: createMOV },
  { ext: '.avi', name: 'test-image', createFn: createAVI },
  { ext: '.mkv', name: 'test-image', createFn: createMKV },
  { ext: '.wmv', name: 'test-image', createFn: createWMV },
  { ext: '.flv', name: 'test-image', createFn: createFLV },
  { ext: '.webm', name: 'test-image', createFn: createWebM },
  { ext: '.m4v', name: 'test-image', createFn: createM4V },
  { ext: '.3gp', name: 'test-image', createFn: create3GP },
  { ext: '.ogv', name: 'test-image', createFn: createOGV }
];

console.log('📁 Creando archivos de prueba para formatos de video...');

videoFormats.forEach(format => {
  try {
    const fileName = `${format.name}${format.ext}`;
    const filePath = path.join(testImagesDir, fileName);
    
    // Solo crear si no existe
    if (!fs.existsSync(filePath)) {
      const fileData = format.createFn();
      fs.writeFileSync(filePath, fileData);
      console.log(`✅ Creado: ${fileName} (${fileData.length} bytes)`);
    } else {
      console.log(`⏭️  Ya existe: ${fileName}`);
    }
  } catch (error) {
    console.error(`❌ Error al crear ${format.name}${format.ext}:`, error.message);
  }
});

console.log('\n✅ Archivos de video creados exitosamente');

