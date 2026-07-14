import preview from '../../../.storybook/preview'
import { FolderOpenIcon } from '@phosphor-icons/react'
import { Button } from './button'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from './empty'

const meta = preview.meta({
  title: 'Design System/Feedback/Empty',
  component: Empty,
  tags: ['autodocs'],
})

export const Default = meta.story({
  render: () => (
    <Empty className="w-96 border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <FolderOpenIcon />
        </EmptyMedia>
        <EmptyTitle>No projects yet</EmptyTitle>
        <EmptyDescription>Create your first project to get started.</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button>Create project</Button>
      </EmptyContent>
    </Empty>
  ),
})
