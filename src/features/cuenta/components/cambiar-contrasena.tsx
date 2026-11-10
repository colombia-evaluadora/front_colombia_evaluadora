import { useState } from "react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { CheckCircleIcon, WarningIcon } from "@/components/ui/icons"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { getErrorMessage } from "@/lib/api-client"
import { PASSWORD_SERVER_RULES, passwordRules } from "@/features/auth/api/schema"
import { useCambiarContrasena } from "@/features/cuenta/api/cuenta"

/** Mi cuenta › Seguridad › Cambiar contraseña (Administración del Sistema §13.5). */
export function CambiarContrasena() {
  const cambiar = useCambiarContrasena()
  const [actual, setActual] = useState("")
  const [nueva, setNueva] = useState("")
  const [confirmar, setConfirmar] = useState("")
  const [intentado, setIntentado] = useState(false)

  const fallas = passwordRules.filter((r) => !r.test(nueva))
  const noCoinciden = confirmar.length > 0 && confirmar !== nueva
  const valido = actual.length > 0 && fallas.length === 0 && nueva === confirmar

  function guardar(e: React.FormEvent) {
    e.preventDefault()
    setIntentado(true)
    if (!valido) return
    cambiar.mutate(
      { actual, nueva },
      {
        onSuccess: () => {
          setActual("")
          setNueva("")
          setConfirmar("")
          setIntentado(false)
        },
      },
    )
  }

  return (
    <section className="bg-card flex flex-col gap-4 rounded-xl border p-5">
      <div>
        <h2 className="text-lg font-semibold">Cambiar contraseña</h2>
        <p className="text-muted-foreground text-sm">
          Al guardar se cierran sus demás sesiones abiertas y le avisamos por correo.
        </p>
      </div>
      {cambiar.isSuccess && (
        <Alert>
          <CheckCircleIcon aria-hidden="true" />
          <AlertTitle>Contraseña cambiada</AlertTitle>
          <AlertDescription>Se cerraron sus demás sesiones.</AlertDescription>
        </Alert>
      )}
      {cambiar.isError && (
        <Alert variant="destructive">
          <WarningIcon aria-hidden="true" />
          <AlertDescription>{getErrorMessage(cambiar.error)}</AlertDescription>
        </Alert>
      )}
      <form className="flex flex-col gap-3" onSubmit={guardar}>
        <Field data-invalid={intentado && !actual}>
          <FieldLabel htmlFor="pwd-actual">Contraseña actual</FieldLabel>
          <Input id="pwd-actual" type="password" autoComplete="current-password" value={actual}
            onChange={(e) => setActual(e.target.value)} />
          {intentado && !actual && <FieldError errors={[{ message: "Requerido" }]} />}
        </Field>
        <Field data-invalid={intentado && fallas.length > 0}>
          <FieldLabel htmlFor="pwd-nueva">Nueva contraseña</FieldLabel>
          <Input id="pwd-nueva" type="password" autoComplete="new-password" maxLength={64} value={nueva}
            onChange={(e) => setNueva(e.target.value)} />
          {intentado && fallas.length > 0 ? (
            <FieldError errors={fallas.map((f) => ({ message: f.message }))} />
          ) : (
            <FieldDescription>
              {passwordRules.map((r) => r.label).join(", ")}. {PASSWORD_SERVER_RULES}
            </FieldDescription>
          )}
        </Field>
        <Field data-invalid={noCoinciden}>
          <FieldLabel htmlFor="pwd-confirmar">Confirmar contraseña</FieldLabel>
          <Input id="pwd-confirmar" type="password" autoComplete="new-password" maxLength={64} value={confirmar}
            onChange={(e) => setConfirmar(e.target.value)} />
          {noCoinciden && <FieldError errors={[{ message: "Las contraseñas no coinciden." }]} />}
        </Field>
        <Button type="submit" color="primary" className="self-start" disabled={cambiar.isPending}>
          {cambiar.isPending && <Spinner data-icon="inline-start" />}
          Guardar contraseña
        </Button>
      </form>
    </section>
  )
}
