import { useForm } from "@tanstack/react-form"
import * as z from "zod"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { EnvelopeIcon, WarningIcon } from "@/components/ui/icons"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { getErrorMessage } from "@/lib/api-client"
import { useUser } from "@/lib/auth"
import { toEmailInput } from "@/lib/text-input"
import { useSolicitarCambioCorreo } from "@/features/cuenta/api/cambio-correo"
import { SeguridadSegundoFactor } from "@/features/cuenta/components/seguridad-segundo-factor"

const cambioCorreoSchema = z.object({
  correoNuevo: z.string().transform(toEmailInput).pipe(z.email("Escriba un correo válido")),
  password: z.string().min(1, "Requerido"),
})

const FORM_ID = "form-cambio-correo"

/** Mi cuenta: datos de la cuenta y cambio de correo (U.6.COR). */
export function MiCuentaPage() {
  const { data: user } = useUser()
  const solicitar = useSolicitarCambioCorreo()

  const form = useForm({
    defaultValues: { correoNuevo: "", password: "" },
    validators: { onSubmit: cambioCorreoSchema },
    onSubmit: ({ value, formApi }) =>
      solicitar.mutate(
        { correoNuevo: toEmailInput(value.correoNuevo), password: value.password },
        { onSuccess: () => formApi.reset() },
      ),
  })

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold">Mi cuenta</h1>
        <p className="text-muted-foreground text-sm">Los datos con los que ingresa a la plataforma.</p>
      </div>

      <section className="bg-card rounded-xl border p-5">
        <dl className="grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground text-xs">Nombre</dt>
            <dd className="font-medium">{user?.name || "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">Correo</dt>
            <dd className="font-medium break-all">{user?.email || "—"}</dd>
          </div>
        </dl>
      </section>

      <section className="bg-card flex flex-col gap-4 rounded-xl border p-5">
        <div>
          <h2 className="text-lg font-semibold">Cambiar el correo</h2>
          <p className="text-muted-foreground text-sm">
            Le enviamos un enlace al correo nuevo que vale 24 horas. Hasta que lo confirme, su cuenta sigue
            con el correo actual. Al confirmar, avisamos al correo anterior.
          </p>
        </div>

        {solicitar.isSuccess && (
          <Alert>
            <EnvelopeIcon aria-hidden="true" />
            <AlertTitle>Revise el correo nuevo</AlertTitle>
            <AlertDescription>
              Enviamos el enlace a {solicitar.data.maskedEmail}. Ábralo en las próximas 24 horas para terminar el cambio.
            </AlertDescription>
          </Alert>
        )}
        {solicitar.isError && (
          <Alert variant="destructive">
            <WarningIcon aria-hidden="true" />
            <AlertTitle>No se pudo pedir el cambio</AlertTitle>
            <AlertDescription>{getErrorMessage(solicitar.error)}</AlertDescription>
          </Alert>
        )}

        <form
          id={FORM_ID}
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit()
          }}
        >
          <FieldGroup>
            <form.Field name="correoNuevo">
              {(field) => {
                const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>Correo nuevo</FieldLabel>
                    <Input
                      id={field.name}
                      type="email"
                      autoComplete="email"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(toEmailInput(e.target.value))}
                      aria-invalid={isInvalid}
                    />
                    {isInvalid && <FieldError errors={field.state.meta.errors} />}
                  </Field>
                )
              }}
            </form.Field>
            <form.Field name="password">
              {(field) => {
                const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>Contraseña actual</FieldLabel>
                    <Input
                      id={field.name}
                      type="password"
                      autoComplete="current-password"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      aria-invalid={isInvalid}
                    />
                    {isInvalid ? (
                      <FieldError errors={field.state.meta.errors} />
                    ) : (
                      <FieldDescription>La pedimos para confirmar que es usted.</FieldDescription>
                    )}
                  </Field>
                )
              }}
            </form.Field>
          </FieldGroup>
        </form>
        <Button type="submit" form={FORM_ID} color="primary" className="self-start" disabled={solicitar.isPending}>
          {solicitar.isPending && <Spinner data-icon="inline-start" />}
          Enviar enlace al correo nuevo
        </Button>
      </section>
      <SeguridadSegundoFactor />
    </div>
  )
}
