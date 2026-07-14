import preview from '../../../.storybook/preview'
import { DirectionProvider } from './direction'
import { Slider } from './slider'

const meta = preview.meta({
  title: 'Design System/Chat/Direction',
  component: DirectionProvider,
  tags: ['autodocs'],
})

export const LeftToRight = meta.story({
  render: () => (
    <DirectionProvider direction="ltr">
      <Slider defaultValue={[30]} className="w-56" />
    </DirectionProvider>
  ),
})

export const RightToLeft = meta.story({
  render: () => (
    <DirectionProvider direction="rtl">
      <Slider defaultValue={[30]} className="w-56" />
    </DirectionProvider>
  ),
})
