import { useState } from "react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { WarningIcon } from "@/components/ui/icons"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { getErrorMessage } from "@/lib/api-client"
import {
  useActivarSegundoFactor,
  useConfirmarActivacion,
  useDesactivarSegundoFactor,
  useEstadoSegundoFactor,
  useRegenerarCodigos,
} from "@/features/auth/api/segundo-factor"
import { CodigosRespaldo, QrApp } from "@/features/auth/components/segundo-factor"

type Accion = "ACTIVAR" | "DESACTIVAR" | "CODIGOS"

const TEXTO: Record<Accion, { boton: string; ayuda: string }> = {
  ACTIVAR: { boton: "Continuar", ayuda: "Escriba su contraseña para configurar la app de autenticación." },
  DESACTIVAR: { boton: "Desactivar", ayuda: "Escriba su contraseña para desactivar la verificación en dos pasos." },
  CODIGOS: { boton: "Generar códigos", ayuda: "Los códigos de respaldo anteriores dejarán de servir." },
}

/** Mi cuenta › Seguridad: verificación en dos pasos (S.8.VER.1). Solo cuentas de funcionario. */
export function SeguridadSegundoFactor() {
  const estado = useEstadoSegundoFactor()
  const activar = useActivarSegundoFactor()
  const confirmar = useConfirmarActivacion()
  const desactivar = useDesactivarSegundoFactor()
  const regenerar = useRegenerarCodigos()
  const [accion, setAccion] = useState<Accion | null>(null)
  const [password, setPassword] = useState("")
  const [codigo, setCodigo] = useState("")

  if (estado.isPending || estado.isError || !estado.data.disponible) return null
  const { activo, obligatorio, codigosRestantes } = estado.data

  const codigos = confirmar.data?.codigosRespaldo ?? regenerar.data?.codigosRespaldo
  const config = activar.data && !confirmar.data ? activar.data : null
  const error = activar.error ?? confirmar.error ?? desactivar.error ?? regenerar.error
  const pendiente = activar.isPending || desactivar.isPending || regenerar.isPending

  function reiniciar(a: Accion | null) {
    setAccion(a)
    setPassword("")
    setCodigo("")
    activar.reset()
    confirmar.reset()
    desactivar.reset()
    regenerar.reset()
  }

  function enviarContrasena(e: React.FormEvent) {
    e.preventDefault()
    if (!password || !accion) return
    const fin = { onSuccess: () => setPassword("") }
    if (accion === "ACTIVAR") activar.mutate(password, fin)
    else if (accion === "DESACTIVAR") desactivar.mutate(password, { onSuccess: () => reiniciar(null) })
    else regenerar.mutate(password, fin)
  }

  return (
    <section className="bg-card flex flex-col gap-4 rounded-xl border p-5">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold">Verificación en dos pasos</h2>
        <Badge variant="soft" color={activo ? "success" : "neutral"}>
          {activo ? "Activa" : "Inactiva"}
        </Badge>
      </div>
      <p className="text-muted-foreground text-sm">
        Además de la contraseña, al entrar se pide un código de su app de autenticación.
        {activo && ` Le quedan ${codigosRestantes} códigos de respaldo.`}
        {obligatorio && " Su cuenta de Superadministrador la necesita: no se puede desactivar."}
      </p>

      {error && (
        <Alert variant="destructive">
          <WarningIcon aria-hidden="true" />
          <AlertDescription>{getErrorMessage(error)}</AlertDescription>
        </Alert>
      )}

      {codigos ? (
        <>
          <CodigosRespaldo codigos={codigos} />
          <Button className="self-start" color="primary" onClick={() => reiniciar(null)}>
            Listo
          </Button>
        </>
      ) : config ? (
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            if (codigo.trim()) confirmar.mutate(codigo.trim())
          }}
        >
          <QrApp config={config} />
          <Field>
            <FieldLabel htmlFor="codigo-activar">2. Código de 6 dígitos de la app</FieldLabel>
            <Input id="codigo-activar" value={codigo} onChange={(e) => setCodigo(e.target.value)} inputMode="numeric" maxLength={6} />
          </Field>
          <div className="flex gap-2">
            <Button type="submit" color="primary" disabled={confirmar.isPending}>
              {confirmar.isPending && <Spinner data-icon="inline-start" />}
              Confirmar
            </Button>
            <Button type="button" variant="ghost" color="neutral" onClick={() => reiniciar(null)}>
              Cancelar
            </Button>
          </div>
        </form>
      ) : accion ? (
        <form className="flex flex-col gap-3" onSubmit={enviarContrasena}>
          <p className="text-sm">{TEXTO[accion].ayuda}</p>
          <Field>
            <FieldLabel htmlFor="password-2fa">Contraseña actual</FieldLabel>
            <Input
              id="password-2fa"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          <div className="flex gap-2">
            <Button type="submit" color={accion === "DESACTIVAR" ? "destructive" : "primary"} disabled={pendiente}>
              {pendiente && <Spinner data-icon="inline-start" />}
              {TEXTO[accion].boton}
            </Button>
            <Button type="button" variant="ghost" color="neutral" onClick={() => reiniciar(null)}>
              Cancelar
            </Button>
          </div>
        </form>
      ) : (
        <div className="flex flex-wrap gap-2">
          {!activo && (
            <Button color="primary" onClick={() => reiniciar("ACTIVAR")}>
              Activar
            </Button>
          )}
          {activo && (
            <>
              <Button variant="outline" color="primary" onClick={() => reiniciar("ACTIVAR")}>
                Configurar de nuevo la app
              </Button>
              <Button variant="outline" color="primary" onClick={() => reiniciar("CODIGOS")}>
                Generar códigos de respaldo nuevos
              </Button>
              {!obligatorio && (
                <Button variant="outline" color="destructive" onClick={() => reiniciar("DESACTIVAR")}>
                  Desactivar
                </Button>
              )}
            </>
          )}
        </div>
      )}
    </section>
  )
}
