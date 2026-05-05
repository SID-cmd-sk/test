#!/usr/bin/env python3
"""Simple static file server for the portfolio site on port 3000."""
import http.server
import socketserver
import os

os.chdir('/app')

class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

PORT = 3000
with socketserver.TCPServer(("0.0.0.0", PORT), NoCacheHandler) as httpd:
    print(f"Serving /app at http://0.0.0.0:{PORT}")
    httpd.serve_forever()
