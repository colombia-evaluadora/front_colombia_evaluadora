import preview from '../../../../.storybook/preview'
import { Badge } from '../badge'

const meta = preview.meta({
  title: 'Design System/Data Display/Badge',
  component: Badge,
  tags: ['autodocs'],
  args: { children: 'Badge' },
})

export const Default = meta.story({})
export const Secondary = meta.story({ args: { color: 'secondary' } })
export const Muted = meta.story({ args: { color: 'muted' } })
export const Destructive = meta.story({ args: { color: 'destructive' } })
export const Info = meta.story({ args: { color: 'info' } })
export const Warning = meta.story({ args: { color: 'warning' } })
export const Success = meta.story({ args: { color: 'success' } })
export const Outline = meta.story({ args: { variant: 'outline' } })
export const Ghost = meta.story({ args: { variant: 'ghost' } })
export const Link = meta.story({ args: { variant: 'link' } })
