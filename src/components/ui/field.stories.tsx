import preview from '../../../.storybook/preview'
import { Checkbox } from './checkbox'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
} from './field'
import { Input } from './input'

const meta = preview.meta({
  title: 'Design System/Forms/Field',
  component: Field,
  tags: ['autodocs'],
})

export const Default = meta.story({
  render: () => (
    <FieldSet className="w-80">
      <FieldLegend>Profile</FieldLegend>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="field-name">Name</FieldLabel>
          <Input id="field-name" placeholder="Jane Doe" />
          <FieldDescription>Your full name as it appears on your ID.</FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="field-email">Email</FieldLabel>
          <Input id="field-email" type="email" placeholder="jane@example.com" />
        </Field>
      </FieldGroup>
    </FieldSet>
  ),
})

export const Horizontal = meta.story({
  render: () => (
    <Field orientation="horizontal" className="w-96">
      <Checkbox id="field-horizontal-checkbox" />
      <FieldLabel htmlFor="field-horizontal-checkbox">
        Accept terms and conditions
      </FieldLabel>
    </Field>
  ),
})

export const WithError = meta.story({
  render: () => (
    <Field data-invalid="true" className="w-80">
      <FieldLabel htmlFor="field-error-email">Email</FieldLabel>
      <Input id="field-error-email" aria-invalid defaultValue="not-an-email" />
      <FieldError errors={[{ message: 'Please enter a valid email address.' }]} />
    </Field>
  ),
})

export const WithSeparator = meta.story({
  render: () => (
    <FieldGroup className="w-80">
      <Field>
        <FieldLabel htmlFor="field-separator-email">Email</FieldLabel>
        <Input id="field-separator-email" placeholder="jane@example.com" />
      </Field>
      <FieldSeparator>or</FieldSeparator>
      <Field>
        <FieldLabel htmlFor="field-separator-username">Username</FieldLabel>
        <Input id="field-separator-username" placeholder="janedoe" />
      </Field>
    </FieldGroup>
  ),
})
