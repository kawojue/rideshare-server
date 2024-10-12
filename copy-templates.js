const { mkdirSync, copyFileSync, readdirSync } = require('fs');
const { join } = require('path');

const srcDir = join(process.cwd(), 'src', 'notification', 'templates');
const destDir = join(process.cwd(), 'dist', 'notification', 'templates');

mkdirSync(destDir, { recursive: true });

const files = readdirSync(srcDir);
files.forEach((file) => {
  copyFileSync(join(srcDir, file), join(destDir, file));
});
