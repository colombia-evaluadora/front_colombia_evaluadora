# Storybook Design System (CSF Factories) — Design

## Goal

Set up Storybook (already installed at `^10.5.0`) using **CSF Factories** — the format that
supersedes CSF3 (`definePreview` / `preview.meta()` / `meta.story()` instead of a plain
`export default meta` object + `export const Story = {...}`) — and generate a full story-based
design system covering every component in `src/components/ui/*.tsx` (60 files).

## Background

- Storybook 10.5 is already installed with `@storybook/react-vite`, `@storybook/builder-vite`,
  `@storybook/addon-docs`, `@storybook/addon-a11y`, `@storybook/addon-vitest`,
  `@chromatic-com/storybook`, `@storybook/addon-mcp`, and `storybook-dark-mode`.
- `.storybook/main.ts` and `.storybook/preview.tsx` currently use plain `defineMain` / a CSF3-style
  `Preview` object — no Tailwind plugin or `@` alias wired into the Storybook Vite build yet.
- The app has two independent theme axes, both driven by DOM attributes on `<html>`, defined in
  `src/index.css` and wired in `src/components/theme-provider.tsx`:
  - light/dark via `next-themes`, applied as `class="dark"` / `class="light"`.
  - brand color (`emerald` default / `blue`) via a custom `ColorThemeProvider`, applied as
    `data-color-theme="blue"` (absent = emerald).
- CSF Factories API (confirmed against Storybook's official docs, `/docs/api/csf/csf-next`):
  - `.storybook/preview.ts` exports `definePreview({ addons, parameters, decorators })`.
  - Each `*.stories.tsx` imports that preview and calls `preview.meta({ component, title, tags, ... })`
    to build a typed `meta`, then `meta.story({ args, parameters, decorators })` per story.
  - Composition via `SomeStory.extend({...})` instead of spreading `.args`.
  - Storybook ships a codemod: `npx storybook automigrate csf-factories`.

## Configuration changes

### `.storybook/main.ts`

Keep `defineMain`, but extend `viteFinal` to merge in what the app's own `vite.config.ts` already
uses so Storybook's build matches the real app:

```ts
return mergeConfig(config, {
  plugins: [tailwindcss()],
  resolve: { alias: { '@': path.resolve(dirname, '../src') } },
  optimizeDeps: { include: ['storybook-dark-mode'] },
});
```

### `.storybook/preview.tsx`

Rewritten to `definePreview()`:

- Imports `../src/index.css` so design tokens are available.
- Registers `storybook-dark-mode` and a global decorator that mirrors its dark-mode global onto
  `document.documentElement` as `class="dark"` / `class="light"` (matching `next-themes`'
  `attribute="class"` behavior).
- Adds a custom toolbar global (`colorTheme`: `emerald` | `blue`) with its own decorator that sets
  `data-color-theme` on `document.documentElement`, mirroring `ColorThemeProvider`.
- Exports `preview` (the `definePreview(...)` result) as the default export — this is what every
  story file imports to build its `meta`.

## Story format

Every `*.stories.tsx` sits next to its component in `src/components/ui/` and follows:

```tsx
import preview from '../../../.storybook/preview'
import { Button } from './button'

const meta = preview.meta({
  title: 'Design System/Forms/Button',
  component: Button,
  tags: ['autodocs'],
})

export const Default = meta.story({ args: { children: 'Button' } })
export const Secondary = meta.story({ args: { variant: 'secondary', children: 'Button' } })
```

Rules:

- **One story per relevant variant/size** defined in each component's `cva` config (read the
  component source first — never invent a variant/prop that doesn't exist).
- Compound components without a `cva` (Dialog, Sheet, Command, Table, Sidebar, etc.) get one story
  per realistic usage pattern instead of a variant sweep.
- `tags: ['autodocs']` on every `meta` — `@storybook/addon-docs` autogenerates the docs page; no
  manual MDX.
- Controlled components (Select, Combobox, Checkbox, RadioGroup, Switch, Slider, InputOTP, Tabs,
  ToggleGroup) use a `render` function with local `useState` so the canvas is interactive.
- Icons in example content use `@phosphor-icons/react` (the only icon library in the project).

## Sidebar taxonomy

`title` groups components under `Design System/<Category>/<Component>`:

| Category | Components |
|---|---|
| Forms | button, button-group, input, input-otp, input-group, label, checkbox, radio-group, select, native-select, combobox, switch, slider, textarea, toggle, toggle-group, field, calendar |
| Overlays | dialog, alert-dialog, sheet, drawer, popover, hover-card, tooltip, dropdown-menu, context-menu, menubar, command |
| Navigation | tabs, breadcrumb, pagination, navigation-menu, sidebar |
| Layout | card, separator, aspect-ratio, resizable, scroll-area, collapsible, accordion, item |
| Data Display | table, avatar, badge, kbd, marker, chart, carousel |
| Feedback | alert, progress, skeleton, spinner, sonner, empty |
| Chat | message, message-scroller, bubble, attachment, direction |

(60 components total, matching the current contents of `src/components/ui/`.)

## Execution plan

1. **Base setup** (sequential): update `main.ts` and `preview.tsx`, run
   `npx storybook automigrate csf-factories` to catch anything the codemod handles that manual
   edits might miss.
2. **Story generation** (parallelized across ~7 batches, one per category above): each batch reads
   its components' source first (props, `cva` variants) then writes stories following the format
   above. Batches are independent — no shared state, safe to run concurrently.
3. **Verification** (sequential, final): run `pnpm storybook`, confirm it builds without type
   errors, and manually check a representative sample (Button, Dialog, Select, Table, Sidebar)
   renders correctly in both theme axes (light/dark × emerald/blue).

## Out of scope

- Visual regression / Chromatic publishing (addon is installed but not configured here — separate
  task).
- `@storybook/addon-vitest` portable-stories test wiring beyond what already exists.
- MDX overview/intro pages beyond the auto-generated per-component docs.
