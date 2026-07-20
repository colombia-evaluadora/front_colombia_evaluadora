import preview from '../../../../.storybook/preview'
import { Button } from '../button'

const meta = preview.meta({
  title: 'Design System/Forms/Button',
  component: Button,
  tags: ['autodocs'],
  args: { children: 'Button' },
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['fill', 'soft', 'outline', 'ghost', 'link'],
      description: 'Variante del Button (sincronizada con Figma: Solid/Soft/Outline/Ghost/Link)',
      table: { defaultValue: { summary: 'fill' } },
    },
    color: {
      control: { type: 'select' },
      options: ['primary', 'secondary', 'muted', 'neutral', 'destructive', 'info', 'warning', 'success'],
      description: 'Tono semántico (8 colores, mapeo Figma → código en `button.tsx`)',
      table: { defaultValue: { summary: 'primary' } },
    },
    size: {
      control: { type: 'select' },
      options: ['default', 'xs', 'sm', 'lg', 'icon', 'icon-xs', 'icon-sm', 'icon-lg'],
      description: 'Tamaño del Button',
      table: { defaultValue: { summary: 'default' } },
    },
  },
})

export const Default = meta.story({})
export const Secondary = meta.story({ args: { variant: 'fill', color: 'secondary' } })
export const Muted = meta.story({ args: { variant: 'fill', color: 'muted' } })
export const Neutral = meta.story({ args: { variant: 'fill', color: 'neutral' } })
export const Outline = meta.story({ args: { variant: 'outline' } })
export const Soft = meta.story({ args: { variant: 'soft' } })
export const Ghost = meta.story({ args: { variant: 'ghost' } })
export const Destructive = meta.story({ args: { variant: 'fill', color: 'destructive' } })
export const Info = meta.story({ args: { variant: 'fill', color: 'info' } })
export const Warning = meta.story({ args: { variant: 'fill', color: 'warning' } })
export const Success = meta.story({ args: { variant: 'fill', color: 'success' } })
export const Link = meta.story({ args: { variant: 'link' } })
export const Small = meta.story({ args: { size: 'sm' } })
export const Large = meta.story({ args: { size: 'lg' } })
export const Icon = meta.story({ args: { size: 'icon', children: '★' } })
export const Disabled = meta.story({ args: { disabled: true } })