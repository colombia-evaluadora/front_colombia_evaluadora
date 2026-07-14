/// <reference types="vite/client" />
import { definePreview } from '@storybook/react-vite'
import addonA11y from '@storybook/addon-a11y'
import '../src/index.css'

const withColorTheme = (Story: () => React.ReactElement, context: { globals: { colorTheme?: string } }) => {
  const colorTheme = context.globals.colorTheme ?? 'emerald'
  if (colorTheme === 'blue') {
    document.documentElement.setAttribute('data-color-theme', 'blue')
  } else {
    document.documentElement.removeAttribute('data-color-theme')
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
      description: 'App brand color theme',
      defaultValue: 'emerald',
      toolbar: {
        icon: 'paintbrush',
        items: [
          { value: 'emerald', title: 'Emerald' },
          { value: 'blue', title: 'Blue' },
        ],
      },
    },
  },
  decorators: [withColorTheme],
})

export default preview
