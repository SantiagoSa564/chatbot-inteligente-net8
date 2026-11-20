// Copy only browser distributions and licenses. ASP.NET and file:// use the same files.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const packages = [
  { name: 'marked', files: ['lib/marked.umd.js', 'LICENSE'] },
  { name: 'dompurify', files: ['dist/purify.min.js', 'LICENSE', 'LICENSE-MPL'] },
  { name: 'fuse.js', files: ['dist/fuse.min.js', 'LICENSE'] }
];
for (const pkg of packages) {
  const source = path.join(root, 'node_modules', pkg.name);
  const destination = path.join(root, 'wwwroot', 'vendor', pkg.name);
  fs.mkdirSync(destination, { recursive: true });
  for (const file of pkg.files) fs.copyFileSync(path.join(source, file), path.join(destination, path.basename(file)));
  const { version } = JSON.parse(fs.readFileSync(path.join(source, 'package.json'), 'utf8'));
  fs.writeFileSync(path.join(destination, 'version.json'), JSON.stringify({ name: pkg.name, version }, null, 2) + '\n');
  console.log(`${pkg.name}@${version}: browser files and license synchronized`);
}
