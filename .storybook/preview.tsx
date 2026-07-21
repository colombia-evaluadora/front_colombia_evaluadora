/// <reference types="vite/client" />
import { useEffect, type ReactNode } from 'react'
import { definePreview } from '@storybook/react-vite'
import addonA11y from '@storybook/addon-a11y'
import addonDocs from '@storybook/addon-docs'
import '../src/index.css'

type Palette = 'default-light' | 'default-dark' | 'red-light' | 'red-dark'

// Aplica `data-theme` en `<html>` post-commit → no dispara el refresh que
// Storybook vigila en "preview changed". Con esto el `<body>` toma
// `--background` correcto vía el `bg-background` que Tailwind aplica en
// index.css, y los componentes dentro del story heredan las variables.
//
// Componente interno porque el decorator `withTheme` no puede llamar al
// hook directamente: no es componente (nombre sin mayúscula) ni hook con
// prefijo `use`, así que las reglas de react-hooks se quejan.
const ThemeApplier = ({
  palette,
  children,
}: {
  palette: Palette
  children: ReactNode
}) => {
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', palette)
    return () => {
      document.documentElement.removeAttribute('data-theme')
    }
  }, [palette])

  return <>{children}</>
}

// eslint-disable-next-line react-refresh/only-export-components -- preview.tsx
// exports `preview` config alongside the helper component above; Fast Refresh
// warnings no aplican porque Storybook carga este archivo una sola vez al
// inicio, no por story.
const withTheme = (
  Story: () => React.ReactElement,
  context: { globals: { palette?: Palette } }
) => {
  const palette: Palette = context.globals.palette ?? 'default-light'
  return <ThemeApplier palette={palette}><Story /></ThemeApplier>
}

export const preview = definePreview({
  addons: [addonA11y(), addonDocs()],
  parameters: {
    darkMode: {
      default: 'light',
      apply: false,
      stylePreview: true,
    },
    a11y: {
      test: 'todo',
    },
  },
  globalTypes: {
    palette: {
      name: 'Palette',
      description: 'Paleta de colores',
      defaultValue: 'default-light',
      toolbar: {
        icon: 'paintbrush',
        items: [
          { value: 'default-light', title: 'Default · Light' },
          { value: 'default-dark', title: 'Default · Dark' },
          { value: 'red-light', title: 'Red · Light' },
          { value: 'red-dark', title: 'Red · Dark' },
        ],
      },
    },
  },
  decorators: [withTheme],
})

export default preview
