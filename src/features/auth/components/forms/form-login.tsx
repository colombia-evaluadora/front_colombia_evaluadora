import { useState } from "react"
import { useForm } from "@tanstack/react-form"
import { Link } from "@tanstack/react-router"
import { EnvelopeIcon, EyeIcon, EyeSlashIcon, LockIcon } from "@/components/ui/icons"
import { toEmailInput } from "@/lib/text-input"
import { isInstalledPersonalDevice } from "@/lib/offline/device-policy"

import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Checkbox } from "@/components/ui/checkbox"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import { paths } from "@/config/paths"

import { loginFormSchema, type LoginFormValues } from "@/features/auth/api/schema"

interface LoginFormProps {
  id: string
  onSubmit: (values: LoginFormValues) => void
}

export function LoginForm({ id, onSubmit }: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false)
  // App instalada (D-12): equipo personal automático, sin checkbox ni piloto.
  const instalada = isInstalledPersonalDevice()

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
      // App instalada = equipo personal; web en pestaña = compartido (no
      // guarda nada). Ya no se pregunta: `lib/offline/install-detection.ts`.
      sharedDevice: !instalada,
    },
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
            const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
            return (
              <Field variant="outlined" data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>Correo o número de documento</FieldLabel>
                <InputGroup className="rounded-sm border-input has-[[data-slot=input-group-control]:focus-visible]:border-ring has-[[data-slot=input-group-control]:focus-visible]:ring-2 has-[[data-slot=input-group-control]:focus-visible]:ring-ring/20 has-[[data-slot][aria-invalid=true]]:border-red">
                  <InputGroupAddon align="inline-start" className="ml-2">
                    <EnvelopeIcon className="size-4 text-muted-foreground" />
                  </InputGroupAddon>
                  <InputGroupInput
                    id={field.name}
                    name={field.name}
                    type="text"
                    inputMode="email"
                    autoComplete="username"
                    placeholder="usuario@institucion.edu.co o 1023456789"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(toEmailInput(e.target.value))}
                    aria-invalid={isInvalid}
                  />
                </InputGroup>
                {isInvalid ? (
                  <FieldError errors={field.state.meta.errors} />
                ) : (
                  <FieldDescription>Usa tu correo electrónico.</FieldDescription>
                )}
              </Field>
            )
          }}
        </form.Field>

        <form.Field name="password">
          {(field) => {
            const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
            return (
              <Field variant="outlined" data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>Contraseña</FieldLabel>
                <InputGroup className="rounded-sm border-input has-[[data-slot=input-group-control]:focus-visible]:border-ring has-[[data-slot=input-group-control]:focus-visible]:ring-2 has-[[data-slot=input-group-control]:focus-visible]:ring-ring/20 has-[[data-slot][aria-invalid=true]]:border-red">
                  <InputGroupAddon align="inline-start" className="ml-2">
                    <LockIcon className="size-4 text-muted-foreground" />
                  </InputGroupAddon>
                  <InputGroupInput
                    id={field.name}
                    name={field.name}
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Ingresar tu contraseña"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    aria-invalid={isInvalid}
                  />
                  <InputGroupAddon align="inline-end" className="mr-2">
                    <InputGroupButton
                      size="icon-xs"
                      onClick={() => setShowPassword((v) => !v)}
                      className="text-muted-foreground hover:text-primary"
                      aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                      aria-pressed={showPassword}
                    >
                      {showPassword ? <EyeSlashIcon /> : <EyeIcon />}
                    </InputGroupButton>
                  </InputGroupAddon>
                </InputGroup>
                {isInvalid ? (
                  <FieldError errors={field.state.meta.errors} />
                ) : (
                  <FieldDescription>Debe contener al menos 8 caracteres.</FieldDescription>
                )}
              </Field>
            )
          }}
        </form.Field>

        <form.Field name="rememberMe">
          {(field) => (
            // `Field` en horizontal: el checkbox va pegado a la izquierda y
            // el label a la derecha, alineados con el inicio de los inputs. El
            // enlace de contraseña olvidada cierra la fila por el otro extremo.
            <Field orientation="horizontal" className="justify-between">
              <div className="flex items-center gap-2">
                <Checkbox
                  id={field.name}
                  checked={field.state.value}
                  onCheckedChange={(checked) => field.handleChange(checked === true)}
                />
                <FieldLabel htmlFor={field.name} className="text-sm font-normal tracking-normal normal-case text-muted-foreground">
                  Mantener sesión iniciada
                </FieldLabel>
              </div>
              <Link
                to={paths.auth.forgotPassword.path}
                className="text-sm text-primary hover:underline"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </Field>
          )}
        </form.Field>

        {instalada ? (
          // App instalada (D-12): equipo personal, guarda los datos.
          <p data-slot="installed-device-note" className="text-xs text-muted-foreground">
            App instalada: este equipo es personal y guarda sus datos para que pueda trabajar sin
            conexión.
          </p>
        ) : (
          // Web en una pestaña = equipo compartido: no se guarda nada en el equipo.
          <p data-slot="shared-device-note" className="text-xs text-muted-foreground">
            Para usar la plataforma sin internet, instale la aplicación en su equipo personal.
          </p>
        )}

      </FieldGroup>
    </form>
  )
}
