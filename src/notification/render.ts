import { join } from 'path';
import { readFileSync, existsSync } from 'fs';

export function render(
  html: string,
  variables?: { [key: string]: string },
): string {
  if (!variables) return html;

  for (const variable in variables) {
    if (variables.hasOwnProperty(variable)) {
      const regex = new RegExp(`\\{${variable}}`, 'g');
      html = html.replace(regex, variables[variable]);
    }
  }

  return html;
}

export function loadTemplate(template: string): string {
  const templatePaths = [
    join(process.cwd(), 'src', 'notification', 'templates', `${template}.html`),
    join(
      process.cwd(),
      'dist',
      'notification',
      'templates',
      `${template}.html`,
    ),
  ];

  let filePath = '';
  for (const path of templatePaths) {
    if (existsSync(path)) {
      filePath = path;
      break;
    }
  }

  if (!filePath) {
    throw new Error(`Template ${template}.html not found in any known paths.`);
  }

  return readFileSync(filePath).toString();
}
