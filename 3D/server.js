const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.bin': 'application/octet-stream',
};

const server = http.createServer((req, res) => {
  let reqUrl = decodeURI(req.url.split('?')[0]);
  if (reqUrl === '/' || reqUrl === '') {
    reqUrl = '/city_generator.html';
  }

  let filePath = path.join(__dirname, reqUrl);

  // Fallback para texturas solicitadas con ruta relativa a la raíz (ej: Textures/colormap.png)
  if (!fs.existsSync(filePath)) {
    if (reqUrl.includes('colormap.png')) {
      const charTex = path.join(__dirname, 'Assets/Character/Models/GLB format/Textures/colormap.png');
      if (fs.existsSync(charTex)) {
        filePath = charTex;
      }
    }
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found: ' + reqUrl);
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache'
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

server.listen(PORT, () => {
  console.log('=====================================================');
  console.log(`🚀 Servidor iniciado exitosamente en: http://localhost:${PORT}`);
  console.log(`🌐 Abriendo http://localhost:${PORT}/city_generator.html`);
  console.log('Presiona Ctrl+C para detener el servidor.');
  console.log('=====================================================');
});
