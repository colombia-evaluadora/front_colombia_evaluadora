/// <reference types="vite/client" />
import { definePreview } from '@storybook/react-vite'
import addonA11y from '@storybook/addon-a11y'
import '../src/index.css'

// Hay 4 combinaciones de tema (2 colores × 2 modos) definidas en `src/index.css`:
//   :root                             — Light (default, sin prefijo de color)
//   .dark                             — Dark
//   [data-color-theme='red']          — Red · Light
//   .dark[data-color-theme='red']     — Red · Dark
//
// El toolbar expone las 4 combinaciones explícitamente; aplica tanto
// `data-color-theme` como la clase `dark` según la selección, de modo que el
// preview refleja el tema final sin depender del toggle de dark mode.
type ThemeMode = 'light' | 'dark' | 'red-light' | 'red-dark'

const withColorTheme = (
  Story: () => React.ReactElement,
  context: { globals: { colorTheme?: ThemeMode } }
) => {
  const colorTheme = context.globals.colorTheme ?? 'light'
  const root = document.documentElement

  // Reset para que cada combinación parta de un estado conocido
  root.removeAttribute('data-color-theme')
  root.classList.remove('dark')

  switch (colorTheme) {
    case 'light':
      // default: sin atributos extra
      break
    case 'dark':
      root.classList.add('dark')
      break
    case 'red-light':
      root.setAttribute('data-color-theme', 'red')
      break
    case 'red-dark':
      root.setAttribute('data-color-theme', 'red')
      root.classList.add('dark')
      break
  }

  return <Story />
}

export const preview = definePreview({
  addons: [addonA11y()],
  parameters: {
    layout: 'centered',
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      test: 'todo',
    },
    darkMode: {
      stylePreview: true,
      classTarget: 'html',
      darkClass: 'dark',
      lightClass: 'light',
    },
  },
  globalTypes: {
    colorTheme: {
      name: 'Color theme',
      description: 'Combinación de paleta de color y modo (4 temas del design system)',
      defaultValue: 'light',
      toolbar: {
        icon: 'paintbrush',
        items: [
          { value: 'light', title: 'Light' },
          { value: 'dark', title: 'Dark' },
          { value: 'red-light', title: 'Red · Light' },
          { value: 'red-dark', title: 'Red · Dark' },
        ],
      },
    },
  },
  decorators: [withColorTheme],
})

export default preview