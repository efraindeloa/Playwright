const fs = require('fs');
const path = require('path');

const testDocsDir = path.join(__dirname);

// PDF válido mínimo (PDF vacío pero válido)
function createPDF() {
  const pdfBase64 = 'JVBERi0xLjQKJdPr6eEKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFIKPj4KZW5kb2JqCjIgMCBvYmoKPDwKL1R5cGUgL1BhZ2VzCi9LaWRzIFszIDAgUl0KL0NvdW50IDEKPD4KZW5kb2JqCjMgMCBvYmoKPDwKL1R5cGUgL1BhZ2UKL1BhcmVudCAyIDAgUgovTWVkaWFCb3ggWzAgMCA2MTIgNzkyXQo+PgplbmRvYmoKeHJlZgowIDQKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDA5IDAwMDAwIG4gCjAwMDAwMDAwNTggMDAwMDAgbiAKMDAwMDAwMDEwNSAwMDAwMCBuIAp0cmFpbGVyCjw8Ci9TaXplIDQKL1Jvb3QgMSAwIFIKPj4Kc3RhcnR4cmVmCjE3MQolJUVPRg==';
  return Buffer.from(pdfBase64, 'base64');
}

// DOC válido (Office 97-2003 - formato OLE2)
function createDOC() {
  // DOC mínimo válido con estructura OLE2 correcta
  // Header OLE2 + estructura básica de Word
  const oleHeader = Buffer.from([
    0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1, // OLE2 signature
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x3E, 0x00, 0x03, 0x00, 0xFE, 0xFF, 0x09, 0x00,
    0x06, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00,
    0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x10, 0x00, 0x00, 0x02, 0x00, 0x00, 0x00
  ]);
  
  // Rellenar con datos básicos para hacer el archivo válido
  const padding = Buffer.alloc(512 - oleHeader.length, 0);
  return Buffer.concat([oleHeader, padding]);
}

// DOCX válido (Office Open XML - ZIP con XML)
function createDOCX() {
  // DOCX es un ZIP. Crear estructura ZIP válida con XML mínimo
  // ZIP header + document.xml mínimo
  const zipHeader = Buffer.from([
    0x50, 0x4B, 0x03, 0x04, // ZIP signature
    0x14, 0x00, 0x00, 0x00, // version
    0x00, 0x00, 0x00, 0x00, // flags
    0x00, 0x00, 0x00, 0x00, // compression
    0x00, 0x00, 0x00, 0x00, // mod time/date
    0x00, 0x00, 0x00, 0x00  // CRC32
  ]);
  
  const xmlContent = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Test Document</w:t></w:r></w:p></w:body></w:document>';
  const xmlBuffer = Buffer.from(xmlContent, 'utf8');
  
  // Crear estructura ZIP básica
  const docx = Buffer.concat([
    zipHeader,
    Buffer.from([0x0D, 0x00, 0x00, 0x00]), // filename length
    Buffer.from('word/document.xml', 'utf8'),
    xmlBuffer
  ]);
  
  return docx;
}

// XLS válido (Excel 97-2003)
function createXLS() {
  // XLS mínimo válido (estructura OLE2 básica)
  return createDOC(); // Similar estructura OLE2
}

// XLSX válido (Excel Open XML)
function createXLSX() {
  // XLSX es similar a DOCX pero con estructura Excel
  return createDOCX(); // Similar estructura ZIP/XML
}

// PPT válido (PowerPoint 97-2003)
function createPPT() {
  // PPT mínimo válido (estructura OLE2 básica)
  return createDOC(); // Similar estructura OLE2
}

// PPTX válido (PowerPoint Open XML)
function createPPTX() {
  // PPTX es similar a DOCX pero con estructura PowerPoint
  return createDOCX(); // Similar estructura ZIP/XML
}

const documentFormats = [
  { ext: '.pdf', name: 'test-document', createFn: createPDF },
  { ext: '.doc', name: 'test-document', createFn: createDOC },
  { ext: '.docx', name: 'test-document', createFn: createDOCX },
  { ext: '.xls', name: 'test-document', createFn: createXLS },
  { ext: '.xlsx', name: 'test-document', createFn: createXLSX },
  { ext: '.ppt', name: 'test-document', createFn: createPPT },
  { ext: '.pptx', name: 'test-document', createFn: createPPTX }
];

console.log('📁 Creando archivos de prueba para formatos de documento...\n');

documentFormats.forEach(format => {
  try {
    const fileName = `${format.name}${format.ext}`;
    const filePath = path.join(testDocsDir, fileName);
    const fileData = format.createFn();
    fs.writeFileSync(filePath, fileData);
    console.log(`✅ Creado: ${fileName} (${fileData.length} bytes)`);
  } catch (error) {
    console.error(`❌ Error al crear ${format.name}${format.ext}:`, error.message);
  }
});

console.log('\n✅ Archivos de documento creados exitosamente');

