const http = require('http');
const https = require('https');
const url = require('url');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby5NB4jNiSvLSjPGSundACpnrYAA-773h0fSPzgJ9GgxWwOBJQC-4mvvHQHnzqV2GGf/exec';

const mimeTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);

    // ✅ API route
    if (parsedUrl.pathname === '/api/cloud-data') {
        // CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
            res.writeHead(200);
            res.end();
            return;
        }

        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });

        req.on('end', () => {
            let method = req.method;
            let jsonBody;

            try {
                jsonBody = JSON.parse(body || '{}');
            } catch (err) {
                jsonBody = {};
            }

            // ✅ Simulate DELETE via POST
            if (method === 'DELETE') {
                method = 'POST';
                jsonBody._method = 'DELETE';
                body = JSON.stringify(jsonBody);
            }
            // ✅ Simulate PUT via POST for Google Script
            if (method === 'PUT') {
                method = 'POST';
                jsonBody._method = 'PUT';
                body = JSON.stringify(jsonBody);
            }

            let targetUrl = GOOGLE_SCRIPT_URL;
            if (method === 'GET' && parsedUrl.query.deviceId) {
                targetUrl += `?deviceId=${parsedUrl.query.deviceId}`;
            }

            const options = {
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                }
            };

            const proxyReq = https.request(targetUrl, options, (proxyRes) => {
                res.writeHead(proxyRes.statusCode, proxyRes.headers);
                proxyRes.pipe(res);
            });

            proxyReq.on('error', (error) => {
                console.error('Proxy error:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: 'Proxy error' }));
            });

            if (body) {
                proxyReq.write(body);
            }

            proxyReq.end();
        });

        return;
    }

    // ✅ Serve static files
    let filePath = '.' + req.url;
    if (filePath === './') filePath = './index.html';

    const ext = path.extname(filePath).toLowerCase();
    const mimeType = mimeTypes[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
        if (err) {
            res.writeHead(err.code === 'ENOENT' ? 404 : 500, { 'Content-Type': 'text/html' });
            res.end(`<h1>${err.code === 'ENOENT' ? '404 Not Found' : 'Server Error'}</h1>`);
        } else {
            res.writeHead(200, { 'Content-Type': mimeType });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, () => {
    console.log(`✅ Server running at http://localhost:${PORT}`);
});