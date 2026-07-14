import preview from '../../../../.storybook/preview'
import { Badge } from '../badge'

const meta = preview.meta({
  title: 'Design System/Data Display/Badge',
  component: Badge,
  tags: ['autodocs'],
  args: { children: 'Badge' },
})

export const Default = meta.story({})
export const Secondary = meta.story({ args: { variant: 'secondary' } })
export const Destructive = meta.story({ args: { variant: 'destructive' } })
export const Outline = meta.story({ args: { variant: 'outline' } })
export const Ghost = meta.story({ args: { variant: 'ghost' } })
export const Link = meta.story({ args: { variant: 'link' } })
