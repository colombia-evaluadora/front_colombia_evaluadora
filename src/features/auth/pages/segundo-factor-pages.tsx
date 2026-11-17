import { useState, type ComponentProps } from "react"
import { Link, useNavigate } from "@tanstack/react-router"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldLabel } from "@/components/ui/field"
import { ArrowLeftIcon, KeyIcon, ShieldLockIcon, WarningIcon } from "@/components/ui/icons"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { Spinner } from "@/components/ui/spinner"
import { paths } from "@/config/paths"
import { toDigitsOnly } from "@/lib/text-input"
import { getErrorMessage } from "@/lib/api-client"
import {
  leerDesafio,
  useCodigoAlCorreo,
  useCompletarLogin,
  useConfiguracionInicial,
  useConfirmarConfiguracionInicial,
  type TipoCodigo,
} from "@/features/auth/api/segundo-factor"
import { CodigosRespaldo, QrApp } from "@/features/auth/components/segundo-factor"

function destino(redirectTo?: string) {
  return redirectTo?.startsWith("/app") ? redirectTo : paths.app.root.getHref()
}

function SinDesafio() {
  return (
    <>
      <CardHeader className="text-center">
        <CardTitle>La verificación venció</CardTitle>
        <CardDescription>Inicie sesión de nuevo para continuar.</CardDescription>
      </CardHeader>
      <CardFooter>
        <Button className="w-full" color="primary" nativeButton={false} render={<Link to={paths.auth.login.getHref()} />}>
          Iniciar sesión
        </Button>
      </CardFooter>
    </>
  )
}

function AvisoError({ error }: { error: unknown }) {
  return (
    <Alert variant="destructive">
      <WarningIcon aria-hidden="true" />
      <AlertDescription>{getErrorMessage(error)}</AlertDescription>
    </Alert>
  )
}

/** U.5.DOS.1 y U.5.DOS.2: código de la app, de respaldo o al correo. */
export function VerificacionPage() {
  const guardado = leerDesafio()
  const navigate = useNavigate()
  const completar = useCompletarLogin()
  const alCorreo = useCodigoAlCorreo()
  const [tipo, setTipo] = useState<TipoCodigo>("APP")
  const [codigo, setCodigo] = useState("")
  const [recordar, setRecordar] = useState(false)

  if (!guardado || guardado.modo !== "VERIFICAR") return <SinDesafio />
  const { desafio, redirectTo } = guardado

  function verificar(e: React.FormEvent) {
    e.preventDefault()
    if (!codigo.trim()) return
    completar.mutate(
      { desafio, codigo: codigo.trim(), tipo, recordar },
      { onSuccess: (data) => data.token && navigate({ to: destino(redirectTo) }) },
    )
  }

  const titulo = tipo === "RESPALDO" ? "Usar un código de respaldo" : "Verificación en dos pasos"
  const ayuda =
    tipo === "RESPALDO"
      ? "Escriba uno de sus códigos de respaldo. Cada código sirve una sola vez."
      : tipo === "CORREO"
        ? `Escriba el código de 6 dígitos que enviamos a ${alCorreo.data?.maskedEmail ?? "su correo"}. Vale 10 minutos.`
        : "Escriba el código de 6 dígitos de su app de autenticación."

  return (
    <>
      <CardHeader className="text-center">
        <div className="bg-primary/10 mx-auto flex size-14 items-center justify-center rounded-full">
          <ShieldLockIcon className="text-primary size-7" aria-hidden="true" />
        </div>
        <CardTitle>{titulo}</CardTitle>
        <CardDescription>{ayuda}</CardDescription>
      </CardHeader>
      <CardContent>
        <form id="form-segundo-factor" onSubmit={verificar} className="flex flex-col gap-4">
          {completar.isError && <AvisoError error={completar.error} />}
          {alCorreo.isError && <AvisoError error={alCorreo.error} />}
          <Field variant="outlined">
            <FieldLabel htmlFor="codigo-2fa">{tipo === "RESPALDO" ? "Código de respaldo" : "Código"}</FieldLabel>
            <CampoCodigo
              id="codigo-2fa"
              value={codigo}
              onChange={(v) => setCodigo(tipo === "RESPALDO" ? v.toUpperCase() : toDigitsOnly(v, 6))}
              inputMode={tipo === "RESPALDO" ? "text" : "numeric"}
              autoComplete="one-time-code"
              maxLength={tipo === "RESPALDO" ? 10 : 6}
              placeholder={tipo === "RESPALDO" ? "K4P7-Q2XM9" : "482917"}
              autoFocus
            />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={recordar} onCheckedChange={(v) => setRecordar(v === true)} />
            Recordar este equipo por 30 días
          </label>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col gap-2">
        <Button type="submit" form="form-segundo-factor" color="primary" className="w-full" disabled={completar.isPending}>
          {completar.isPending && <Spinner data-icon="inline-start" />}
          Verificar
        </Button>
        {/* Alternativas y volver en una sola fila; flex-wrap las baja si no entran (móvil). */}
        <div className="flex w-full flex-wrap items-center justify-center gap-x-4 gap-y-1">
          <Button variant="ghost" color="primary" nativeButton={false} render={<Link to={paths.auth.login.getHref()} />}>
            <ArrowLeftIcon data-icon="inline-start" />
            Volver a iniciar sesión
          </Button>
          {tipo !== "APP" && (
            <Button variant="link" color="primary" onClick={() => { setTipo("APP"); setCodigo("") }}>
              Usar el código de la app
            </Button>
          )}
          {tipo !== "CORREO" && (
            <Button
              variant="link"
              color="primary"
              disabled={alCorreo.isPending}
              onClick={() => alCorreo.mutate(desafio, { onSuccess: () => { setTipo("CORREO"); setCodigo("") } })}
            >
              Enviar un código a mi correo
            </Button>
          )}
          {tipo !== "RESPALDO" && (
            <Button variant="link" color="primary" onClick={() => { setTipo("RESPALDO"); setCodigo("") }}>
              Usar un código de respaldo
            </Button>
          )}
        </div>
      </CardFooter>
    </>
  )
}

/** U.5.DOS.3: primer ingreso del Superadministrador (escanear, confirmar, códigos de respaldo). */
export function ConfigurarVerificacionPage() {
  const guardado = leerDesafio()
  const navigate = useNavigate()
  const config = useConfiguracionInicial(guardado?.modo === "CONFIGURAR" ? guardado.desafio : undefined)
  const confirmar = useConfirmarConfiguracionInicial()
  const completar = useCompletarLogin()
  const [codigo, setCodigo] = useState("")

  if (!guardado || guardado.modo !== "CONFIGURAR") return <SinDesafio />
  const { desafio, redirectTo } = guardado
  const codigos = confirmar.data?.codigosRespaldo

  return (
    <>
      <CardHeader className="text-center">
        <CardTitle>Configure la verificación en dos pasos</CardTitle>
        <CardDescription>
          Su cuenta la necesita para entrar. 1. Escanear · 2. Confirmar · 3. Códigos de respaldo
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {config.isError && <AvisoError error={config.error} />}
        {config.isPending && (
          <div className="flex justify-center py-6">
            <Spinner />
          </div>
        )}
        {config.data && !codigos && (
          <>
            <QrApp config={config.data} />
            <form
              className="flex flex-col gap-3"
              onSubmit={(e) => {
                e.preventDefault()
                if (codigo.trim()) confirmar.mutate({ desafio, codigo: codigo.trim() })
              }}
            >
              {confirmar.isError && <AvisoError error={confirmar.error} />}
              <Field variant="outlined">
                <FieldLabel htmlFor="codigo-config">2. Código de 6 dígitos de la app</FieldLabel>
                <CampoCodigo
                  id="codigo-config"
                  value={codigo}
                  onChange={(v) => setCodigo(toDigitsOnly(v, 6))}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                />
              </Field>
              <Button type="submit" color="primary" disabled={confirmar.isPending}>
                {confirmar.isPending && <Spinner data-icon="inline-start" />}
                Confirmar
              </Button>
            </form>
          </>
        )}
        {codigos && (
          <>
            <p className="font-semibold">3. Códigos de respaldo</p>
            <CodigosRespaldo codigos={codigos} />
            {completar.isError && <AvisoError error={completar.error} />}
          </>
        )}
      </CardContent>
      {codigos && (
        <CardFooter>
          <Button
            className="w-full"
            color="primary"
            disabled={completar.isPending}
            onClick={() =>
              completar.mutate({ desafio }, { onSuccess: (data) => data.token && navigate({ to: destino(redirectTo) }) })
            }
          >
            {completar.isPending && <Spinner data-icon="inline-start" />}
            Ya los guardé, entrar
          </Button>
        </CardFooter>
      )}
    </>
  )
}

/** Campo del código con el mismo input con borde e ícono que el login (form-login.tsx). */
function CampoCodigo({
  onChange,
  ...props
}: Omit<ComponentProps<typeof InputGroupInput>, "onChange"> & { onChange: (valor: string) => void }) {
  return (
    <InputGroup className="rounded-md border-input has-[[data-slot=input-group-control]:focus-visible]:border-ring has-[[data-slot=input-group-control]:focus-visible]:ring-2 has-[[data-slot=input-group-control]:focus-visible]:ring-ring/20 has-[[data-slot][aria-invalid=true]]:border-red">
      <InputGroupAddon align="inline-start" className="ml-2">
        <KeyIcon className="size-4 text-muted-foreground" />
      </InputGroupAddon>
      <InputGroupInput {...props} className="tracking-widest" onChange={(e) => onChange(e.target.value)} />
    </InputGroup>
  )
}
