// Minimal static server for local testing (no dependencies)
const http = require("http");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const port = process.argv[2] ? Number(process.argv[2]) : 8137;
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

http
  .createServer((req, res) => {
    let p = decodeURIComponent(req.url.split("?")[0]);
    if (p === "/") p = "/index.html";
    const fp = path.join(root, p);
    if (!fp.startsWith(root)) {
      res.writeHead(403);
      return res.end("forbidden");
    }
    fs.readFile(fp, (err, buf) => {
      if (err) {
        res.writeHead(404);
        return res.end("not found");
      }
      res.writeHead(200, { "Content-Type": types[path.extname(fp)] || "application/octet-stream" });
      res.end(buf);
    });
  })
  .listen(port, () => console.log("serving " + root + " on http://localhost:" + port));
