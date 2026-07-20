import preview from '../../../../.storybook/preview'
import { Badge } from '../badge'

const meta = preview.meta({
  title: 'Design System/Data Display/Badge',
  component: Badge,
  tags: ['autodocs'],
  args: { children: 'Badge' },
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['fill', 'soft', 'outline'],
      description: 'Variante del Badge (sincronizada con Figma)',
      table: { defaultValue: { summary: 'fill' } },
    },
    color: {
      control: { type: 'select' },
      options: ['primary', 'secondary', 'muted', 'neutral', 'destructive', 'info', 'warning', 'success'],
      description: 'Tono semántico (8 colores, mapeo Figma → código en `badge.tsx`)',
      table: { defaultValue: { summary: 'primary' } },
    },
  },
})

export const Default = meta.story({})
export const Secondary = meta.story({ args: { color: 'secondary' } })
export const Muted = meta.story({ args: { color: 'muted' } })
export const Neutral = meta.story({ args: { color: 'neutral' } })
export const Destructive = meta.story({ args: { color: 'destructive' } })
export const Info = meta.story({ args: { color: 'info' } })
export const Warning = meta.story({ args: { color: 'warning' } })
export const Success = meta.story({ args: { color: 'success' } })
export const Soft = meta.story({ args: { variant: 'soft' } })
export const Outline = meta.story({ args: { variant: 'outline' } })