import { useEffect, useState } from "react"
import { useForm, useStore } from "@tanstack/react-form"
import { Link } from "@tanstack/react-router"
import { EnvelopeIcon, EyeIcon, EyeSlashIcon, LockIcon } from "@/components/ui/icons"
import { toEmailInput } from "@/lib/text-input"
import { canUsePersonalDevice, isInstalledPersonalDevice } from "@/lib/offline/device-policy"
import { canChoosePersonalDevice } from "@/lib/offline/pilot"

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
      // Un equipo compartido no guarda nada (§0.3). Si el piloto offline
      // abarca a todos (`VITE_APP_OFFLINE_PILOT=*`), el default es "personal":
      // con "compartido" marcado por defecto el docente que solo iniciaba
      // sesión se quedaba sin menú ni datos guardados y offline no podía
      // trabajar. Fuera del piloto sigue siendo "compartido" y la página
      // revalida con el token (`isOfflinePilotUser`). En la app instalada es
      // siempre personal (`lib/offline/device-policy.ts`).
      sharedDevice: !instalada && !canChoosePersonalDevice(""),
    },
    validators: {
      onChange: loginFormSchema,
    },
    onSubmit: ({ value }) => onSubmit(value),
  })

  // Solo el piloto puede desmarcar "equipo compartido" (plan §0.3). Antes del
  // login se decide por el correo escrito; la página revalida con el token.
  const email = useStore(form.store, (state) => state.values.email)
  const sharedDevice = useStore(form.store, (state) => state.values.sharedDevice)
  const puedeElegirPersonal = canUsePersonalDevice(email)
  useEffect(() => {
    if (!puedeElegirPersonal && !sharedDevice) form.setFieldValue("sharedDevice", true)
  }, [form, puedeElegirPersonal, sharedDevice])

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
                <FieldLabel htmlFor={field.name}>Correo electrónico</FieldLabel>
                <InputGroup className="rounded-md border-input has-[[data-slot=input-group-control]:focus-visible]:border-ring has-[[data-slot=input-group-control]:focus-visible]:ring-2 has-[[data-slot=input-group-control]:focus-visible]:ring-ring/20 has-[[data-slot][aria-invalid=true]]:border-red">
                  <InputGroupAddon align="inline-start" className="ml-2">
                    <EnvelopeIcon className="size-4 text-muted-foreground" />
                  </InputGroupAddon>
                  <InputGroupInput
                    id={field.name}
                    name={field.name}
                    type="email"
                    autoComplete="username"
                    placeholder="usuario@institucion.edu.co"
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
                <InputGroup className="rounded-md border-input has-[[data-slot=input-group-control]:focus-visible]:border-ring has-[[data-slot=input-group-control]:focus-visible]:ring-2 has-[[data-slot=input-group-control]:focus-visible]:ring-ring/20 has-[[data-slot][aria-invalid=true]]:border-red">
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
                <FieldLabel htmlFor={field.name} className="font-normal text-muted-foreground">
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

        <form.Field name="sharedDevice">
          {(field) =>
            instalada ? (
              // En la app instalada no se ofrece "equipo compartido": nadie la
              // instala en un computador de sala, y el docente la instala para
              // trabajar sin conexión (default revisable, D-12).
              <p data-slot="installed-device-note" className="text-xs text-muted-foreground">
                App instalada: este equipo es personal y guarda tus datos para que puedas trabajar sin
                conexión.
              </p>
            ) : (
            <Field orientation="horizontal" className="items-start">
              <Checkbox
                id={field.name}
                checked={field.state.value}
                disabled={!puedeElegirPersonal}
                onCheckedChange={(checked) => field.handleChange(checked === true)}
              />
              <div className="flex flex-col gap-1">
                <FieldLabel htmlFor={field.name} className="font-normal text-muted-foreground">
                  Este es un equipo compartido
                </FieldLabel>
                {!puedeElegirPersonal && (
                  <FieldDescription>
                    Solo los usuarios del piloto sin conexión pueden usar este equipo como personal.
                  </FieldDescription>
                )}
                {!field.state.value && (
                  <FieldDescription>
                    Al desmarcar, este equipo guardará nombres de tus estudiantes y tus registros
                    sin conexión. Úsalo solo en un equipo personal.
                  </FieldDescription>
                )}
              </div>
            </Field>
            )
          }
        </form.Field>
      </FieldGroup>
    </form>
  )
}
