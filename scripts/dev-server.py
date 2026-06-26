"""
Local dev server that mirrors Vercel's URL rewrites + static serving.

Why this exists: the production site uses clean URLs like
/products/bpc-tb500 (rewritten by vercel.json -> /product.html, which
then reads the slug from the path). Python's built-in http.server
doesn't do rewrites, so those URLs 404 locally. This script wraps
SimpleHTTPRequestHandler and adds the same rewrites Vercel does.

Usage:  python scripts/dev-server.py [PORT] [ROOT]
Both args optional. Defaults: PORT=5500, ROOT=. (project root).
"""
import http.server
import socketserver
import sys
import os
import re
from urllib.parse import urlparse

# Rewrites — mirror vercel.json
REWRITES = [
    (re.compile(r"^/products/[^/]+/?$"), "/product.html"),
]

# Redirects — mirror vercel.json
REDIRECTS = [
    (re.compile(r"^/index\.html$"), "/", 301),
]


class RewriteHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):  # noqa: N802 (http.server naming convention)
        path = urlparse(self.path).path

        # Redirects first
        for pattern, dest, code in REDIRECTS:
            if pattern.match(path):
                self.send_response(code)
                self.send_header("Location", dest)
                self.end_headers()
                return

        # Rewrites: change the resolved file but keep the URL bar
        for pattern, dest in REWRITES:
            if pattern.match(path):
                self.path = dest
                break

        return super().do_GET()


def main() -> None:
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 5500
    root = sys.argv[2] if len(sys.argv) > 2 else "."
    os.chdir(root)
    with socketserver.TCPServer(("", port), RewriteHandler) as httpd:
        print(f"PepGuide dev server  ->  http://localhost:{port}  (root: {os.getcwd()})")
        print("Rewrites:")
        for p, d in REWRITES:
            print(f"   {p.pattern}  ->  {d}")
        print("Press Ctrl-C to stop.")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nshutting down")


if __name__ == "__main__":
    main()
