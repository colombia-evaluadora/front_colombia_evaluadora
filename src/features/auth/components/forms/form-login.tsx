import { useState } from "react"
import { useForm } from "@tanstack/react-form"
import { Link } from "@tanstack/react-router"
import { EyeIcon, EyeSlashIcon } from "@phosphor-icons/react"

import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import { paths } from "@/config/paths"

import { loginFormSchema, type LoginFormValues } from "../../api/schema"

interface LoginFormProps {
  id: string
  onSubmit: (values: LoginFormValues) => void
}

export function LoginForm({ id, onSubmit }: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false)

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    } as LoginFormValues,
    validators: {
      onChange: loginFormSchema,
    },
    onSubmit: ({ value }) => onSubmit(value),
  })

  return (
    <form
      id={id}
      onSubmit={(e) => {
        e.preventDefault()
        form.handleSubmit()
      }}
    >
      <FieldGroup>
        <form.Field name="email">
          {(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid
            return (
              <Field data-invalid={isInvalid}>
                <div className="flex items-center justify-between gap-2">
                  <FieldLabel htmlFor={field.name}>Email</FieldLabel>
                  <Link
                    to={paths.auth.forgotUsername.path}
                    className="text-muted-foreground hover:text-primary text-xs underline underline-offset-4"
                  >
                    ¿Lo olvidaste?
                  </Link>
                </div>
                <Input
                  id={field.name}
                  name={field.name}
                  type="email"
                  autoComplete="username"
                  placeholder="nombre@empresa.com"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  aria-invalid={isInvalid}
                />
                {isInvalid && (
                  <FieldError errors={field.state.meta.errors} />
                )}
              </Field>
            )
          }}
        </form.Field>

        <form.Field name="password">
          {(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid
            return (
              <Field data-invalid={isInvalid}>
                <div className="flex items-center justify-between gap-2">
                  <FieldLabel htmlFor={field.name}>Contraseña</FieldLabel>
                  <Link
                    to={paths.auth.forgotPassword.path}
                    className="text-muted-foreground hover:text-primary text-xs underline underline-offset-4"
                  >
                    ¿La olvidaste?
                  </Link>
                </div>
                <InputGroup>
                  <InputGroupInput
                    id={field.name}
                    name={field.name}
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Ingresa tu contraseña"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    aria-invalid={isInvalid}
                  />
                  <InputGroupAddon align="inline-end">
                    <InputGroupButton
                      size="icon-xs"
                      onClick={() => setShowPassword((v) => !v)}
                      className="text-muted-foreground hover:text-primary"
                      aria-label={
                        showPassword
                          ? "Ocultar contraseña"
                          : "Mostrar contraseña"
                      }
                      aria-pressed={showPassword}
                    >
                      {showPassword ? <EyeSlashIcon /> : <EyeIcon />}
                    </InputGroupButton>
                  </InputGroupAddon>
                </InputGroup>
                {isInvalid && (
                  <FieldError errors={field.state.meta.errors} />
                )}
              </Field>
            )
          }}
        </form.Field>

        <form.Field name="rememberMe">
          {(field) => (
            // `Field` en horizontal: el checkbox va pegado a la izquierda y
            // el label a la derecha, alineados con el inicio de los inputs.
            <Field orientation="horizontal">
              <Checkbox
                id={field.name}
                checked={field.state.value}
                onCheckedChange={(checked) => field.handleChange(checked === true)}
              />
              <FieldLabel
                htmlFor={field.name}
                className="font-normal"
              >
                Mantener sesión iniciada
              </FieldLabel>
            </Field>
          )}
        </form.Field>
      </FieldGroup>
    </form>
  )
}
