import { useState } from "react"
import { useNavigate } from "@tanstack/react-router"

import { PublicBand } from "@/components/public/public-page"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import {
  ArrowLeftIcon,
  InfoIcon,
  MagnifyingGlassIcon,
  ShieldCheckIcon,
  XCircleIcon,
} from "@/components/ui/icons"
import { Input } from "@/components/ui/input"
import { env } from "@/config/env"
import { paths } from "@/config/paths"

import { ComprobarArchivo } from "@/features/publico/verificar/components/comprobar-archivo"
import { CopiaDocumento } from "@/features/publico/verificar/components/copia-documento"
import {
  AccionesDocumento,
  DetalleDocumento,
  EstadoDocumento,
} from "@/features/publico/verificar/components/resultado-documento"
import { VerContenido } from "@/features/publico/verificar/components/ver-contenido"
import {
  EJEMPLOS_DEMO,
  buscarDocumentoDemo,
  esCodigoDemo,
  type DocumentoVerificado,
} from "@/features/publico/verificar/datos-demo"

const BREADCRUMB = ["Verificar un documento"]

type Vista =
  | { tipo: "formulario" }
  | { tipo: "resultado" | "contenido" | "copia" | "archivo"; documento: DocumentoVerificado }

/**
 * U.4.COD.1 Verificar un documento. Escribir el código es para quien no puede
 * escanear el QR. Con mocks activos, los códigos de la vista previa
 * (`datos-demo.ts`) se resuelven aquí con todas las pantallas de la guía.
 * Cualquier otro código (y todos en test/prod) va a la ruta común
 * /verificar/<código> (Adm. §12.4): carné y boletín (que redirige a su página).
 */
export function VerificarPage() {
  const navigate = useNavigate()
  const [vista, setVista] = useState<Vista>({ tipo: "formulario" })
  const [codigo, setCodigo] = useState("")
  const [robot, setRobot] = useState(false)
  const [intentado, setIntentado] = useState(false)
  /** Código de la vista previa que no corresponde a ningún documento. */
  const [noEncontrado, setNoEncontrado] = useState<string | null>(null)
  const limpio = codigo.trim()

  function ir(v: Vista) {
    setVista(v)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  function verificar(e: React.FormEvent) {
    e.preventDefault()
    setIntentado(true)
    if (!limpio || !robot) return
    // Los datos de ejemplo solo existen con mocks: en test/prod nunca se muestran.
    if (!env.ENABLE_API_MOCKING || !esCodigoDemo(limpio.toUpperCase())) {
      navigate({ to: paths.verificarDocumento.getHref(limpio) })
      return
    }
    const documento = buscarDocumentoDemo(limpio.toUpperCase())
    if (!documento) {
      setNoEncontrado(limpio)
      return
    }
    setNoEncontrado(null)
    ir({ tipo: "resultado", documento })
  }

  if (vista.tipo !== "formulario") {
    const { documento } = vista
    return (
      <PublicBand
        icon={ShieldCheckIcon}
        title="Verificar un documento"
        subtitle="Resultado de la verificación."
        breadcrumb={BREADCRUMB}
        width={vista.tipo === "copia" ? "xl" : "md"}
        backToHome
      >
        <div className="flex flex-col gap-5">
          <div className="-mx-6 -mt-6 flex flex-wrap items-center justify-between gap-2 border-b px-6 py-3">
            <p className="text-muted-foreground text-sm">
              Código{" "}
              <span className="text-foreground font-mono font-semibold">{documento.codigo}</span>
            </p>
            {vista.tipo === "resultado" ? (
              <Button
                variant="outline"
                color="neutral"
                onClick={() => {
                  setCodigo("")
                  setRobot(false)
                  setIntentado(false)
                  ir({ tipo: "formulario" })
                }}
              >
                <MagnifyingGlassIcon data-icon="inline-start" />
                Verificar otro código
              </Button>
            ) : (
              <Button
                variant="outline"
                color="neutral"
                onClick={() => ir({ tipo: "resultado", documento })}
              >
                <ArrowLeftIcon data-icon="inline-start" />
                Volver al resultado
              </Button>
            )}
          </div>

          {vista.tipo === "resultado" && (
            <>
              <EstadoDocumento documento={documento} />
              <DetalleDocumento documento={documento} />
              <AccionesDocumento
                documento={documento}
                onVerContenido={() => ir({ tipo: "contenido", documento })}
                onComprobar={() => ir({ tipo: "archivo", documento })}
              />
            </>
          )}
          {vista.tipo === "contenido" && documento.contenido && (
            <VerContenido
              key={documento.codigo}
              documentoCorrecto={documento.contenido.documentoCompleto}
              onAutorizado={() => ir({ tipo: "copia", documento })}
            />
          )}
          {vista.tipo === "copia" && <CopiaDocumento documento={documento} />}
          {vista.tipo === "archivo" && <ComprobarArchivo codigo={documento.codigo} />}
        </div>
      </PublicBand>
    )
  }

  return (
    // Mismo marco que Inscribir y Consultar inscripción: franja con título y puntos, tarjeta central.
    <PublicBand
      icon={ShieldCheckIcon}
      title="Verificar un documento"
      subtitle="Compruebe que un documento lo emitió la plataforma."
      points={[
        "Autenticidad en segundos",
        "Sin mostrar datos personales",
        "Con el código o el código QR",
      ]}
      breadcrumb={BREADCRUMB}
      width="md"
      backToHome
    >
      <form noValidate className="flex flex-col gap-5" onSubmit={verificar}>
        {noEncontrado ? (
          // Mismo estilo de alerta que el resto de avisos (caja con borde).
          <Alert variant="destructive" role="alert">
            <XCircleIcon />
            <AlertTitle>Documento no encontrado</AlertTitle>
            <AlertDescription>
              No hay ningún documento con el código {noEncontrado}. Revise que lo haya escrito bien.
            </AlertDescription>
          </Alert>
        ) : (
          env.ENABLE_API_MOCKING && (
            <Alert variant="info">
              <InfoIcon />
              <AlertDescription>
                Vista previa con códigos de ejemplo: {EJEMPLOS_DEMO.join(" · ")}.
              </AlertDescription>
            </Alert>
          )
        )}

        <Field variant="outlined" data-invalid={(intentado && !limpio) || undefined}>
          <FieldLabel htmlFor="codigo-verificacion">
            Código de verificación{" "}
            <span aria-hidden="true" data-required-mark="">
              *
            </span>
          </FieldLabel>
          <Input
            id="codigo-verificacion"
            required
            aria-invalid={intentado && !limpio}
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            placeholder="K7QM-4XPA-9TRB"
            autoComplete="off"
            spellCheck={false}
            className="font-mono tracking-wider"
          />
          <FieldDescription className={intentado && !limpio ? "text-red" : undefined}>
            {intentado && !limpio
              ? "Escriba el código de verificación."
              : "Escriba el código que aparece debajo del código QR del documento."}
          </FieldDescription>
        </Field>
        <div className="flex flex-col gap-1.5">
          {/* Lugar del captcha del sitio público (pendiente de conectar). */}
          <label className="flex w-fit cursor-pointer items-center gap-2 text-sm">
            <Checkbox
              checked={robot}
              onCheckedChange={(c) => setRobot(Boolean(c))}
              aria-invalid={intentado && !robot}
            />
            No soy un robot
          </label>
          {intentado && !robot && <p className="text-red text-xs">Confirme que no es un robot.</p>}
        </div>
        <Button type="submit" className="w-full">
          <MagnifyingGlassIcon data-icon="inline-start" />
          Verificar
        </Button>
      </form>
    </PublicBand>
  )
}
