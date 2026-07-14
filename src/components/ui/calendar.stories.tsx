import preview from '../../../.storybook/preview'
import { useState } from 'react'
import { Calendar } from './calendar'

const meta = preview.meta({
  title: 'Design System/Forms/Calendar',
  component: Calendar,
  tags: ['autodocs'],
})

export const Default = meta.story({
  render: () => {
    const [date, setDate] = useState<Date | undefined>(new Date())
    return (
      <Calendar mode="single" selected={date} onSelect={setDate} className="rounded-md border" />
    )
  },
})

export const Range = meta.story({
  render: () => {
    const [range, setRange] = useState<{ from: Date; to?: Date } | undefined>()
    return (
      <Calendar mode="range" selected={range} onSelect={setRange} className="rounded-md border" />
    )
  },
})
