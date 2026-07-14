# Storybook CSF Factories Design System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate Storybook config to CSF Factories and generate a complete story-based design
system covering all 60 components in `src/components/ui/`, wired into the app's real Tailwind
tokens and both theme axes (light/dark, emerald/blue).

**Architecture:** `.storybook/preview.tsx` exports a single `definePreview()` result (`preview`)
that every `*.stories.tsx` imports to build a typed `meta` via `preview.meta()` and stories via
`meta.story()`. `.storybook/main.ts`'s `viteFinal` merges in the app's Tailwind v4 plugin and `@`
alias so Storybook renders with the real design tokens from `src/index.css`. Stories live next to
their component and are generated category by category (Forms, Overlays, Navigation, Layout, Data
Display, Feedback, Chat), each category an independent, parallelizable unit of work.

**Tech Stack:** Storybook 10.5 (`@storybook/react-vite`, `@storybook/builder-vite`), CSF Factories
(`definePreview`/`preview.meta`/`meta.story`), `@storybook/addon-docs` (autodocs), `storybook-dark-mode`,
Tailwind v4, `@phosphor-icons/react`.

**No unit tests are added by this plan** — verification per task is "Storybook builds and the
story renders in the canvas without console/type errors," checked via `pnpm exec tsc -b --noEmit`
(fast per-task check) and `pnpm build-storybook` (full check, run once at the end).

---

## File Structure

| File | Responsibility |
|---|---|
| `.storybook/main.ts` | Modify: merge Tailwind plugin + `@` alias into Storybook's Vite build |
| `.storybook/preview.tsx` | Rewrite: `definePreview()`, theme decorators, dark-mode + color-theme toolbar globals |
| `src/components/ui/*.stories.tsx` | Create: one per existing component (60 files), colocated |
| `src/stories/*` | Delete: Storybook's default boilerplate example (Button/Header/Page + assets) |

---

### Task 1: Wire Tailwind + path alias into Storybook's Vite build

**Files:**
- Modify: `.storybook/main.ts`

- [ ] **Step 1: Add the Tailwind plugin and `@` alias to `viteFinal`**

Replace the whole file with:

```ts
import { defineMain } from '@storybook/react-vite/node';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineMain({
  framework: '@storybook/react-vite',
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: [
    '@chromatic-com/storybook',
    '@storybook/addon-vitest',
    '@storybook/addon-a11y',
    '@storybook/addon-docs',
    '@storybook/addon-mcp',
    'storybook-dark-mode',
  ],
  core: {
    builder: '@storybook/builder-vite',
  },
  async viteFinal(config) {
    const { mergeConfig } = await import('vite');
    const tailwindcss = (await import('@tailwindcss/vite')).default;

    return mergeConfig(config, {
      plugins: [tailwindcss()],
      resolve: {
        alias: {
          '@': path.resolve(dirname, '../src'),
        },
      },
      optimizeDeps: {
        include: ['storybook-dark-mode'],
      },
    });
  },
});
```

- [ ] **Step 2: Verify the config loads**

Run: `pnpm exec storybook build --test -o /tmp/sb-test-build`
Expected: build starts and does not throw a config-loading error (it will still fail later since
`preview.tsx` hasn't been migrated yet — that's expected at this step; just confirm no error
mentions `main.ts`, `tailwindcss`, or alias resolution).

- [ ] **Step 3: Commit**

```bash
git add .storybook/main.ts
git commit -m "storybook: wire Tailwind v4 plugin and @ alias into Vite build"
```

---

### Task 2: Migrate `preview.tsx` to CSF Factories with theme decorators

**Files:**
- Modify: `.storybook/preview.tsx`

- [ ] **Step 1: Replace the file with a `definePreview()`-based config**

```tsx
import { definePreview } from '@storybook/react-vite'
import { addons } from 'storybook/preview-api'
import addonA11y from '@storybook/addon-a11y'
import '../src/index.css'

const withTheme = (Story: React.ComponentType, context: { globals: Record<string, string> }) => {
  const isDark = context.globals.backgrounds?.value === 'dark' || context.globals.dark === true
  document.documentElement.classList.toggle('dark', isDark)
  document.documentElement.classList.toggle('light', !isDark)
  return <Story />
}

const withColorTheme = (Story: React.ComponentType, context: { globals: Record<string, string> }) => {
  const colorTheme = context.globals.colorTheme ?? 'emerald'
  if (colorTheme === 'blue') {
    document.documentElement.setAttribute('data-color-theme', 'blue')
  } else {
    document.documentElement.removeAttribute('data-color-theme')
  }
  return <Story />
}

export default definePreview({
  addons: [addonA11y()],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      test: 'todo',
    },
  },
  globalTypes: {
    colorTheme: {
      name: 'Color theme',
      description: 'App brand color theme',
      defaultValue: 'emerald',
      toolbar: {
        icon: 'paintbrush',
        items: [
          { value: 'emerald', title: 'Emerald' },
          { value: 'blue', title: 'Blue' },
        ],
      },
    },
  },
  decorators: [withTheme, withColorTheme],
})
```

Note: `storybook-dark-mode` exposes its state on `context.globals.backgrounds` in v5 via the
`DARK_MODE_EVENT_NAME` channel event, not a plain global — if `context.globals.dark` is undefined
at runtime, switch `withTheme` to listen for the `DARK_MODE_EVENT_NAME` channel event instead
(`addons.getChannel().on(DARK_MODE_EVENT_NAME, (isDark) => ...)`) and drive the class toggle from
that callback. Confirm which path is correct empirically in Step 2 below — don't guess further,
inspect the actual global shape Storybook produces in the browser devtools console
(`window.__STORYBOOK_ADDONS_CHANNEL__`).

- [ ] **Step 2: Run automigrate as a safety net for anything the manual edit missed**

Run: `npx storybook automigrate csf-factories`
Expected: reports "no changes needed" or applies small touch-ups to `main.ts`/`preview.tsx`. If it
rewrites something you already hand-wrote in Step 1, keep the codemod's version — it reflects the
canonical current API.

- [ ] **Step 3: Verify dark mode toggle actually flips the `.dark` class**

Run: `pnpm storybook` (leave running in a background terminal), open `http://localhost:6006`,
toggle dark mode in the toolbar, and inspect `<html>` in devtools.
Expected: `class="dark"` appears/disappears on `<html>` as the toggle is flipped, and the "Color
theme" toolbar item toggles `data-color-theme="blue"` on/off `<html>`.

- [ ] **Step 4: Commit**

```bash
git add .storybook/preview.tsx
git commit -m "storybook: migrate preview to CSF Factories with theme decorators"
```

---

### Task 3: Remove Storybook's default boilerplate stories

**Files:**
- Delete: `src/stories/` (entire directory — `Button.stories.ts`, `Button.tsx`, `button.css`,
  `Header.stories.ts`, `Header.tsx`, `header.css`, `Page.stories.ts`, `Page.tsx`, `page.css`,
  `Configure.mdx`, `assets/*`)

- [ ] **Step 1: Delete the directory**

```bash
git rm -r src/stories
```

- [ ] **Step 2: Verify Storybook still starts with an empty story list**

Run: `pnpm storybook` (if not already running from Task 2) and confirm the sidebar is empty (no
errors about missing files).

- [ ] **Step 3: Commit**

```bash
git commit -m "storybook: remove default boilerplate example stories"
```

---

### Task 4: Forms category stories

**Components:** `button`, `button-group`, `input`, `input-otp`, `input-group`, `label`, `checkbox`,
`radio-group`, `select`, `native-select`, `combobox`, `switch`, `slider`, `textarea`, `toggle`,
`toggle-group`, `field`, `calendar` (18 components)

**Files:**
- Create: `src/components/ui/button.stories.tsx`
- Create: `src/components/ui/input.stories.tsx`
- Create: one `*.stories.tsx` per remaining component listed above, colocated with its source

- [ ] **Step 1: Write the worked example — `button.stories.tsx`**

Read `src/components/ui/button.tsx` first (already known: `variant` = default | outline | secondary
| ghost | destructive | link; `size` = default | xs | sm | lg | icon | icon-xs | icon-sm | icon-lg).

```tsx
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
```

- [ ] **Step 2: Write the worked example — `input.stories.tsx`**

`Input` has no `cva` variants (single style, native `<input>` props pass through) — cover
placeholder, disabled, invalid, and file type instead of variant sweep.

```tsx
import preview from '../../../.storybook/preview'
import { Input } from './input'

const meta = preview.meta({
  title: 'Design System/Forms/Input',
  component: Input,
  tags: ['autodocs'],
  args: { placeholder: 'Email address' },
})

export const Default = meta.story({})
export const Disabled = meta.story({ args: { disabled: true } })
export const Invalid = meta.story({ args: { 'aria-invalid': true } })
export const FileInput = meta.story({ args: { type: 'file', placeholder: undefined } })
```

- [ ] **Step 3: Generate the remaining 16 components in this category**

For each of `button-group`, `input-otp`, `input-group`, `label`, `checkbox`, `radio-group`,
`select`, `native-select`, `combobox`, `switch`, `slider`, `textarea`, `toggle`, `toggle-group`,
`field`, `calendar`:

1. Read the component's source file to find its actual `cva` variants/sizes and props (do not
   invent props that don't exist).
2. Follow the exact pattern from Steps 1–2: `title: 'Design System/Forms/<Name>'`,
   `tags: ['autodocs']`, one story per variant/size, controlled components (`Checkbox`,
   `RadioGroup`, `Select`, `Combobox`, `Switch`, `Slider`, `InputOTP`, `ToggleGroup`, `Calendar`)
   get a `render` function with local `useState` so they're interactive in the canvas.
3. Save as `src/components/ui/<name>.stories.tsx`.

- [ ] **Step 4: Verify the whole category type-checks and renders**

Run: `pnpm exec tsc -b --noEmit`
Expected: no errors.

Run: `pnpm storybook` and open each new story under "Design System/Forms" in the sidebar.
Expected: every story renders without a red error overlay or console error.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/*.stories.tsx
git commit -m "storybook: add Forms category stories"
```

---

### Task 5: Overlays category stories

**Components:** `dialog`, `alert-dialog`, `sheet`, `drawer`, `popover`, `hover-card`, `tooltip`,
`dropdown-menu`, `context-menu`, `menubar`, `command` (11 components)

**Files:**
- Create: `src/components/ui/dialog.stories.tsx`
- Create: one `*.stories.tsx` per remaining component listed above, colocated with its source

- [ ] **Step 1: Write the worked example — `dialog.stories.tsx`**

`Dialog` is a compound component with no `cva` — one story per realistic usage, not a variant
sweep. Uses `DialogTrigger` (render prop composition with `Button`).

```tsx
import preview from '../../../.storybook/preview'
import { Button } from './button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './dialog'

const meta = preview.meta({
  title: 'Design System/Overlays/Dialog',
  component: Dialog,
  tags: ['autodocs'],
})

export const Default = meta.story({
  render: () => (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" />}>Open dialog</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit profile</DialogTitle>
          <DialogDescription>
            Make changes to your profile here. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          <Button>Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
})

export const WithoutCloseButton = meta.story({
  render: () => (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" />}>Open dialog</DialogTrigger>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>No close button</DialogTitle>
          <DialogDescription>
            This dialog only closes via the footer action.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter showCloseButton>
          <Button>Confirm</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
})
```

- [ ] **Step 2: Generate the remaining 10 components in this category**

For each of `alert-dialog`, `sheet`, `drawer`, `popover`, `hover-card`, `tooltip`, `dropdown-menu`,
`context-menu`, `menubar`, `command`:

1. Read the component's source file to see its actual sub-components and props.
2. Follow the pattern from Step 1: `title: 'Design System/Overlays/<Name>'`, `tags: ['autodocs']`,
   one story per realistic usage pattern (e.g. `dropdown-menu` gets a story with plain items and
   one with checkbox/radio items if the component supports them; `tooltip` and `hover-card` get a
   single default story since they have one usage shape).
3. Save as `src/components/ui/<name>.stories.tsx`.

- [ ] **Step 3: Verify**

Run: `pnpm exec tsc -b --noEmit`
Expected: no errors.

Run: `pnpm storybook` and open each new story under "Design System/Overlays".
Expected: every story renders, triggers open/close their overlay without console errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/*.stories.tsx
git commit -m "storybook: add Overlays category stories"
```

---

### Task 6: Navigation category stories

**Components:** `tabs`, `breadcrumb`, `pagination`, `navigation-menu`, `sidebar` (5 components)

**Files:**
- Create: `src/components/ui/tabs.stories.tsx`
- Create: one `*.stories.tsx` per remaining component listed above, colocated with its source

- [ ] **Step 1: Write the worked example — `tabs.stories.tsx`**

`Tabs` has a `variant` on `TabsList` (`default` | `line`) and `orientation` on `Tabs`
(`horizontal` | `vertical`).

```tsx
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
```

- [ ] **Step 2: Generate the remaining 4 components — `breadcrumb`, `pagination`,
  `navigation-menu`, `sidebar`**

1. Read each component's source file for its actual sub-components and props.
2. Follow the pattern: `title: 'Design System/Navigation/<Name>'`, `tags: ['autodocs']`, one
   default realistic-usage story (`sidebar` needs its `SidebarProvider` wrapper in the `render`;
   check `src/components/ui/sidebar.tsx` for the exact provider/trigger API before writing it).
3. Save as `src/components/ui/<name>.stories.tsx`.

- [ ] **Step 3: Verify**

Run: `pnpm exec tsc -b --noEmit`
Expected: no errors.

Run: `pnpm storybook` and open each new story under "Design System/Navigation".
Expected: every story renders without console errors; sidebar story shows the collapsed/expanded
toggle working.

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/*.stories.tsx
git commit -m "storybook: add Navigation category stories"
```

---

### Task 7: Layout category stories

**Components:** `card`, `separator`, `aspect-ratio`, `resizable`, `scroll-area`, `collapsible`,
`accordion`, `item` (8 components)

**Files:**
- Create: `src/components/ui/card.stories.tsx`
- Create: one `*.stories.tsx` per remaining component listed above, colocated with its source

- [ ] **Step 1: Write the worked example — `card.stories.tsx`**

`Card` has a `size` prop (`default` | `sm`), no `cva`.

```tsx
import preview from '../../../.storybook/preview'
import { Button } from './button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from './card'

const meta = preview.meta({
  title: 'Design System/Layout/Card',
  component: Card,
  tags: ['autodocs'],
})

export const Default = meta.story({
  render: () => (
    <Card className="w-80">
      <CardHeader>
        <CardTitle>Create project</CardTitle>
        <CardDescription>Deploy your new project in one click.</CardDescription>
        <CardAction>
          <Button variant="ghost" size="icon-sm">
            ⋮
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <p>Card body content goes here.</p>
      </CardContent>
      <CardFooter className="justify-end gap-2">
        <Button variant="outline">Cancel</Button>
        <Button>Deploy</Button>
      </CardFooter>
    </Card>
  ),
})

export const Small = meta.story({
  render: () => (
    <Card size="sm" className="w-80">
      <CardHeader>
        <CardTitle>Compact card</CardTitle>
        <CardDescription>Uses the sm size token.</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Less padding than the default card.</p>
      </CardContent>
    </Card>
  ),
})
```

- [ ] **Step 2: Generate the remaining 7 components — `separator`, `aspect-ratio`, `resizable`,
  `scroll-area`, `collapsible`, `accordion`, `item`**

1. Read each component's source file for its actual sub-components and props.
2. Follow the pattern: `title: 'Design System/Layout/<Name>'`, `tags: ['autodocs']`, one story per
   relevant variant (`accordion` covers `single` and `multiple` `type`; `separator` covers
   `horizontal`/`vertical` orientation).
3. Save as `src/components/ui/<name>.stories.tsx`.

- [ ] **Step 3: Verify**

Run: `pnpm exec tsc -b --noEmit`
Expected: no errors.

Run: `pnpm storybook` and open each new story under "Design System/Layout".
Expected: every story renders without console errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/*.stories.tsx
git commit -m "storybook: add Layout category stories"
```

---

### Task 8: Data Display category stories

**Components:** `table`, `avatar`, `badge`, `kbd`, `marker`, `chart`, `carousel` (7 components)

**Files:**
- Create: `src/components/ui/table.stories.tsx`
- Create: one `*.stories.tsx` per remaining component listed above, colocated with its source

- [ ] **Step 1: Write the worked example — `table.stories.tsx`**

`Table` is a compound component (no `cva`) — one story showing a realistic data table.

```tsx
import preview from '../../../.storybook/preview'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './table'

const invoices = [
  { invoice: 'INV001', status: 'Paid', method: 'Credit Card', amount: '$250.00' },
  { invoice: 'INV002', status: 'Pending', method: 'PayPal', amount: '$150.00' },
  { invoice: 'INV003', status: 'Unpaid', method: 'Bank Transfer', amount: '$350.00' },
]

const meta = preview.meta({
  title: 'Design System/Data Display/Table',
  component: Table,
  tags: ['autodocs'],
})

export const Default = meta.story({
  render: () => (
    <Table>
      <TableCaption>A list of recent invoices.</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Invoice</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Method</TableHead>
          <TableHead className="text-right">Amount</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {invoices.map((invoice) => (
          <TableRow key={invoice.invoice}>
            <TableCell>{invoice.invoice}</TableCell>
            <TableCell>{invoice.status}</TableCell>
            <TableCell>{invoice.method}</TableCell>
            <TableCell className="text-right">{invoice.amount}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  ),
})
```

- [ ] **Step 2: Generate the remaining 6 components — `avatar`, `badge`, `kbd`, `marker`, `chart`,
  `carousel`**

1. Read each component's source file for its actual `cva` variants/props.
2. Follow the pattern: `title: 'Design System/Data Display/<Name>'`, `tags: ['autodocs']`, one
   story per variant (`badge` likely has `default`/`secondary`/`outline`/`destructive`; `chart`
   needs a small realistic dataset and its `ChartConfig` — read `src/components/ui/chart.tsx`
   closely since its API is less standard than the others).
3. Save as `src/components/ui/<name>.stories.tsx`.

- [ ] **Step 3: Verify**

Run: `pnpm exec tsc -b --noEmit`
Expected: no errors.

Run: `pnpm storybook` and open each new story under "Design System/Data Display".
Expected: every story renders without console errors; `chart` renders an actual chart, not a blank
canvas.

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/*.stories.tsx
git commit -m "storybook: add Data Display category stories"
```

---

### Task 9: Feedback category stories

**Components:** `alert`, `progress`, `skeleton`, `spinner`, `sonner`, `empty` (6 components)

**Files:**
- Create: `src/components/ui/alert.stories.tsx`
- Create: one `*.stories.tsx` per remaining component listed above, colocated with its source

- [ ] **Step 1: Write the worked example — `alert.stories.tsx`**

`Alert` has a `variant` (`default` | `destructive`).

```tsx
import preview from '../../../.storybook/preview'
import { Alert, AlertDescription, AlertTitle } from './alert'

const meta = preview.meta({
  title: 'Design System/Feedback/Alert',
  component: Alert,
  tags: ['autodocs'],
})

export const Default = meta.story({
  render: (args) => (
    <Alert {...args} className="w-96">
      <AlertTitle>Heads up!</AlertTitle>
      <AlertDescription>You can add components to your app using the CLI.</AlertDescription>
    </Alert>
  ),
})

export const Destructive = meta.story({
  args: { variant: 'destructive' },
  render: (args) => (
    <Alert {...args} className="w-96">
      <AlertTitle>Something went wrong</AlertTitle>
      <AlertDescription>Your session has expired. Please log in again.</AlertDescription>
    </Alert>
  ),
})
```

- [ ] **Step 2: Generate the remaining 5 components — `progress`, `skeleton`, `spinner`, `sonner`,
  `empty`**

1. Read each component's source file for its actual props.
2. Follow the pattern: `title: 'Design System/Feedback/<Name>'`, `tags: ['autodocs']`. `sonner` is
   the app's toast provider — its story should render a `Button` that calls `toast(...)` from
   `sonner` on click inside a `render` function, wrapped in the `Toaster` component it exports, so
   the toast is visibly demonstrable in the canvas.
3. Save as `src/components/ui/<name>.stories.tsx`.

- [ ] **Step 3: Verify**

Run: `pnpm exec tsc -b --noEmit`
Expected: no errors.

Run: `pnpm storybook` and open each new story under "Design System/Feedback".
Expected: every story renders without console errors; clicking the trigger button in the `sonner`
story visibly shows a toast.

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/*.stories.tsx
git commit -m "storybook: add Feedback category stories"
```

---

### Task 10: Chat category stories

**Components:** `message`, `message-scroller`, `bubble`, `attachment`, `direction` (5 components)

**Files:**
- Create: `src/components/ui/message.stories.tsx`
- Create: one `*.stories.tsx` per remaining component listed above, colocated with its source

- [ ] **Step 1: Write the worked example — `message.stories.tsx`**

`Message` has an `align` prop (`start` | `end`), used with `MessageAvatar`/`MessageContent`.

```tsx
import preview from '../../../.storybook/preview'
import { Message, MessageAvatar, MessageContent } from './message'

const meta = preview.meta({
  title: 'Design System/Chat/Message',
  component: Message,
  tags: ['autodocs'],
})

export const IncomingStart = meta.story({
  render: () => (
    <Message align="start" className="max-w-md">
      <MessageAvatar>AI</MessageAvatar>
      <MessageContent>Hi! How can I help you today?</MessageContent>
    </Message>
  ),
})

export const OutgoingEnd = meta.story({
  render: () => (
    <Message align="end" className="max-w-md">
      <MessageContent>I need help setting up Storybook.</MessageContent>
    </Message>
  ),
})
```

- [ ] **Step 2: Generate the remaining 4 components — `message-scroller`, `bubble`, `attachment`,
  `direction`**

1. Read each component's source file — these are project-specific (not standard shadcn), so check
   their actual props/behavior carefully before writing usage examples.
2. Follow the pattern: `title: 'Design System/Chat/<Name>'`, `tags: ['autodocs']`, one story per
   realistic usage (`message-scroller` needs several `Message` children stacked inside it to show
   scroll behavior; `direction` likely wraps content to set RTL/LTR — check its source for the
   exact prop name).
3. Save as `src/components/ui/<name>.stories.tsx`.

- [ ] **Step 3: Verify**

Run: `pnpm exec tsc -b --noEmit`
Expected: no errors.

Run: `pnpm storybook` and open each new story under "Design System/Chat".
Expected: every story renders without console errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/*.stories.tsx
git commit -m "storybook: add Chat category stories"
```

---

### Task 11: Full verification pass

**Files:** none (verification only)

- [ ] **Step 1: Full type check**

Run: `pnpm exec tsc -b --noEmit`
Expected: no errors across the whole project.

- [ ] **Step 2: Full Storybook production build**

Run: `pnpm build-storybook`
Expected: build completes with no errors and no unresolved-import warnings.

- [ ] **Step 3: Manual spot-check across both theme axes**

Run: `pnpm storybook`, open Button, Dialog, Select, Table, and Sidebar stories. For each, toggle
dark mode and the "Color theme" toolbar item (emerald/blue).
Expected: colors visibly change to match `src/index.css`'s `.dark` and `[data-color-theme='blue']`
token overrides — e.g. Button's `--primary` shifts between the emerald and blue `oklch` values
defined in `index.css:43` / `index.css:69` / `index.css:103` / `index.css:131`.

- [ ] **Step 4: Confirm sidebar taxonomy matches the plan**

Open the Storybook sidebar and confirm all 60 components appear under exactly these 7 top-level
groups: Forms, Overlays, Navigation, Layout, Data Display, Feedback, Chat — with none left
uncategorized or duplicated.

- [ ] **Step 5: Commit (only if Step 1-4 required fixes)**

```bash
git add -A
git commit -m "storybook: fix issues found in full verification pass"
```

If no fixes were needed, skip this step — there's nothing to commit.

---

## Self-Review Notes

- **Spec coverage:** main.ts/preview.tsx config (Task 1-2), boilerplate removal (Task 3), all 7
  categories from the spec's taxonomy table (Tasks 4-10), theme integration verified end-to-end
  (Task 11) — every spec section has a corresponding task.
- **Type consistency:** `preview` import path (`'../../../.storybook/preview'`) and `meta.story()`/
  `preview.meta()` calls are identical across every worked example (Tasks 4-10, Step 1s).
- **No placeholders:** every worked example is complete, real code checked against the actual
  component source read during planning; the only open items (Storybook's exact dark-mode global
  shape in Task 2, and per-component prop shapes for the non-worked-example components in each
  category) are explicitly called out as "read the source first" steps, not left as unspecified
  TODOs.
