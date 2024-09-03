import { join } from 'path'
import { readFileSync } from 'fs'

export function render(
  html: string,
  variables?: { [key: string]: string },
): string {
  if (!variables) return html

  for (const variable in variables) {
    if (variables.hasOwnProperty(variable)) {
      const regex = new RegExp(`\\{${variable}}`, 'g')
      html = html.replace(regex, variables[variable])
    }
  }

  return html
}

export function loadTemplate(template: string): string {
  const file = readFileSync(join(__dirname, 'templates', template + '.html'))
  return file.toString()
}
