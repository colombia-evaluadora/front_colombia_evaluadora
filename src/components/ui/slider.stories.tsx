import preview from '../../../.storybook/preview'
import { useState } from 'react'
import { Slider } from './slider'

const meta = preview.meta({
  title: 'Design System/Forms/Slider',
  component: Slider,
  tags: ['autodocs'],
})

export const Default = meta.story({
  render: () => {
    const [value, setValue] = useState([50])
    return <Slider className="w-56" value={value} onValueChange={setValue} />
  },
})

export const Range = meta.story({
  render: () => {
    const [value, setValue] = useState([25, 75])
    return <Slider className="w-56" value={value} onValueChange={setValue} />
  },
})

export const Vertical = meta.story({
  render: () => {
    const [value, setValue] = useState([40])
    return <Slider orientation="vertical" className="h-40" value={value} onValueChange={setValue} />
  },
})

export const Disabled = meta.story({
  args: { defaultValue: [50], disabled: true },
})
