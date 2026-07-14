import preview from '../../../.storybook/preview'
import { Button } from './button'

const meta = preview.meta({
  title: 'Design System/Forms/Button',
  component: Button,
  tags: ['autodocs'],
  args: { children: 'Button' },
})

export const Default = meta.story({})
export const Secondary = meta.story({ args: { variant: 'secondary' } })
export const Outline = meta.story({ args: { variant: 'outline' } })
export const Ghost = meta.story({ args: { variant: 'ghost' } })
export const Destructive = meta.story({ args: { variant: 'destructive' } })
export const Link = meta.story({ args: { variant: 'link' } })
export const Small = meta.story({ args: { size: 'sm' } })
export const Large = meta.story({ args: { size: 'lg' } })
export const Icon = meta.story({ args: { size: 'icon', children: '★' } })
export const Disabled = meta.story({ args: { disabled: true } })
