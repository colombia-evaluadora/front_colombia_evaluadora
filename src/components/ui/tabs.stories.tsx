import preview from '../../../.storybook/preview'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs'

const meta = preview.meta({
  title: 'Design System/Navigation/Tabs',
  component: Tabs,
  tags: ['autodocs'],
})

export const Default = meta.story({
  render: () => (
    <Tabs defaultValue="account" className="w-80">
      <TabsList>
        <TabsTrigger value="account">Account</TabsTrigger>
        <TabsTrigger value="password">Password</TabsTrigger>
      </TabsList>
      <TabsContent value="account">Account settings go here.</TabsContent>
      <TabsContent value="password">Password settings go here.</TabsContent>
    </Tabs>
  ),
})

export const LineVariant = meta.story({
  render: () => (
    <Tabs defaultValue="account" className="w-80">
      <TabsList variant="line">
        <TabsTrigger value="account">Account</TabsTrigger>
        <TabsTrigger value="password">Password</TabsTrigger>
      </TabsList>
      <TabsContent value="account">Account settings go here.</TabsContent>
      <TabsContent value="password">Password settings go here.</TabsContent>
    </Tabs>
  ),
})

export const Vertical = meta.story({
  render: () => (
    <Tabs defaultValue="account" orientation="vertical" className="w-96">
      <TabsList>
        <TabsTrigger value="account">Account</TabsTrigger>
        <TabsTrigger value="password">Password</TabsTrigger>
      </TabsList>
      <TabsContent value="account">Account settings go here.</TabsContent>
      <TabsContent value="password">Password settings go here.</TabsContent>
    </Tabs>
  ),
})
