// Builds a single self-contained HTML file of the whole site.
//
// Everything — JavaScript, CSS, the favicon and the figure images — is inlined,
// so the result opens from a file:// path or any static host with no server
// rewrites and no network access. Used for review, not for deployment.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(here, ".out");
const publicDir = path.join(here, "..", "..", "public");

const mime = { ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".webp": "image/webp" };

function dataUri(file) {
  const ext = path.extname(file).toLowerCase();
  return `data:${mime[ext] ?? "application/octet-stream"};base64,${fs.readFileSync(file).toString("base64")}`;
}

function filesBelow(directory) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const location = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...filesBelow(location));
    else if (entry.isFile()) files.push(location);
  }
  return files;
}

let html = fs.readFileSync(path.join(out, "index.html"), "utf8");

// Inline the stylesheet and the module bundle.
html = html.replace(/<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g, (_, href) => {
  const css = fs.readFileSync(path.join(out, href.replace(/^\.\//, "")), "utf8");
  return `<style>\n${css}\n</style>`;
});
html = html.replace(/<script[^>]*src="([^"]+)"[^>]*><\/script>/g, (_, src) => {
  const js = fs.readFileSync(path.join(out, src.replace(/^\.\//, "")), "utf8");
  return `<script type="module">\n${js}\n</script>`;
});

// Inline the favicon and every figure the article pages reference.
html = html.replace(/href="\.\/favicon\.svg"/g, () => `href="${dataUri(path.join(publicDir, "favicon.svg"))}"`);
for (const figure of filesBelow(path.join(publicDir, "figures"))) {
  const publicPath = path.relative(publicDir, figure).split(path.sep).join("/");
  html = html.split(publicPath).join(dataUri(figure));
}

// The app resolves figure paths through BASE_URL; with base "./" that leaves a
// leading "./" in front of the already-inlined data URI.
html = html.replace(/"\.\/data:/g, '"data:');

const target = path.join(here, "dunaterp-preview.html");
fs.writeFileSync(target, html);
const kb = (fs.statSync(target).size / 1024).toFixed(0);
console.log(`wrote ${path.relative(process.cwd(), target)} (${kb} KB, single file)`);
