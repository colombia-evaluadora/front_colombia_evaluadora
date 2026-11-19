import { useState } from "react"
import { format } from "date-fns"

import { DatePicker } from "@/components/date-picker"
import { ErrorNoticeBanner } from "@/components/notice/error-notice-banner"
import { useNotify } from "@/components/notice/notice-context"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { FileDownloadOutlinedIcon, FileUploadOutlinedIcon, XIcon } from "@/components/ui/icons"
import { Input } from "@/components/ui/input"
import { useUser } from "@/lib/auth"
import { fetchArchivoViewUrl } from "@/lib/files"

import { ComboOpciones } from "@/features/gestion-estudiantil/commons/components/combo-opciones"
import { IconoCarga } from "@/features/gestion-estudiantil/commons/components/icono-carga"
import { SoportesUpload } from "@/features/gestion-estudiantil/commons/components/soportes-upload"
import { formatFecha } from "@/features/gestion-estudiantil/commons/utils/formatos"
import type { Opcion } from "@/features/gestion-estudiantil/commons/utils/opcion"
import { enfocarPrimerError } from "@/features/gestion-estudiantil/commons/utils/validaciones"
import { useCargarFirmado, useObservadorFirmadosQuery } from "@/features/gestion-estudiantil/observador/api/firmado"

interface Props {
  /** Estudiantes elegibles («Nombre · Grado/Grupo»). */
  estudiantes: Opcion[]
  periodos: Opcion[]
  /** Sin permiso o capacidad: el botón se deshabilita, no se oculta. */
  disabled?: boolean
}

interface Valores {
  estudiante: string
  periodo: string
  fecha: Date | undefined
  archivos: File[]
}

const VACIO: Valores = { estudiante: "", periodo: "", fecha: undefined, archivos: [] }

const iso = (d: Date) => format(d, "yyyy-MM-dd")

function validar(v: Valores) {
  const e: Partial<Record<keyof Valores, string>> = {}
  if (!v.estudiante) e.estudiante = "El estudiante es obligatorio."
  if (!v.periodo) e.periodo = "El período es obligatorio."
  if (!v.fecha) e.fecha = "La fecha de la firma es obligatoria."
  else if (iso(v.fecha) > iso(new Date())) e.fecha = "La fecha de la firma no puede ser posterior a hoy."
  if (v.archivos.length === 0) e.archivos = "Adjunte el observador firmado."
  return e
}

/** Abre el archivo con un token de vista de file-service (el navegador lo muestra o lo descarga). */
async function abrirArchivo(fkArchivo: number) {
  const { url } = await fetchArchivoViewUrl(fkArchivo)
  window.open(url, "_blank", "noopener")
}

/**
 * «Cargar observador firmado» (guía de diseño, DCU Observador): adjunta el observador impreso y
 * firmado de un estudiante para un período. Sube el PDF por file-service, lo registra y, al elegir
 * el estudiante, muestra los firmados que ya tiene, descargables.
 */
export function DialogCargarObservadorFirmado({ estudiantes, periodos, disabled }: Props) {
  const { data: user } = useUser()
  const { notify } = useNotify()
  const [open, setOpen] = useState(false)
  const [v, setV] = useState<Valores>(VACIO)
  const [intento, setIntento] = useState(false)
  const [errorBackend, setErrorBackend] = useState<unknown>(null)
  const cambiar = <K extends keyof Valores>(campo: K, valor: Valores[K]) => {
    setV((prev) => ({ ...prev, [campo]: valor }))
  }
  const errores = validar(v)
  const error = (k: keyof Valores) => (intento ? errores[k] : undefined)
  const firmados = useObservadorFirmadosQuery(v.estudiante ? Number(v.estudiante) : undefined)

  const reiniciar = () => {
    setV(VACIO)
    setIntento(false)
    setErrorBackend(null)
  }
  const mut = useCargarFirmado({
    mutationConfig: {
      onSuccess: () => {
        notify("Observador firmado cargado.", { variant: "success" })
        setOpen(false)
        reiniciar()
      },
      onError: (e: Error) => setErrorBackend(e),
    },
  })

  const guardar = () => {
    setIntento(true)
    setErrorBackend(null)
    if (Object.keys(errores).length > 0 || !v.fecha) return enfocarPrimerError()
    mut.mutate({
      FK_MATRICULA: Number(v.estudiante),
      FK_PERIODO_EVALUACION: v.periodo ? Number(v.periodo) : null,
      FECHA_FIRMA: iso(v.fecha),
      archivo: v.archivos[0],
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(abierto) => {
        setOpen(abierto)
        if (!abierto) reiniciar()
      }}
    >
      <DialogTrigger disabled={disabled} render={<Button size="sm" variant="outline" color="muted" />}>
        <FileUploadOutlinedIcon data-icon="inline-start" />
        Cargar observador firmado
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Cargar observador firmado</DialogTitle>
        </DialogHeader>

        <ErrorNoticeBanner error={errorBackend} />

        <div className="grid gap-4 pt-2 sm:grid-cols-2">
          <ComboOpciones
            id="firmado-estudiante"
            className="gap-2 sm:col-span-2"
            label="Estudiante"
            required
            todos={false}
            placeholder="Seleccione"
            value={v.estudiante}
            options={estudiantes}
            error={error("estudiante")}
            onChange={(x) => cambiar("estudiante", x)}
            description="Busca por nombre o documento."
          />
          <ComboOpciones
            id="firmado-periodo"
            label="Período"
            required
            todos={false}
            placeholder="Seleccione"
            value={v.periodo}
            options={periodos}
            error={error("periodo")}
            onChange={(x) => cambiar("periodo", x)}
            description="El período del observador que se firmó."
          />
          <Field variant="outlined" className="gap-2" data-invalid={Boolean(error("fecha")) || undefined}>
            <FieldLabel htmlFor="firmado-fecha">Fecha de la firma*</FieldLabel>
            <DatePicker
              id="firmado-fecha"
              value={v.fecha}
              onChange={(d) => cambiar("fecha", d)}
              maxDate={new Date()}
              aria-invalid={Boolean(error("fecha")) || undefined}
            />
            {error("fecha") ? <FieldError>{error("fecha")}</FieldError> : <FieldDescription>No posterior a hoy.</FieldDescription>}
          </Field>
          <div className="flex flex-col gap-1 sm:col-span-2" data-invalid={Boolean(error("archivos")) || undefined}>
            <SoportesUpload
              label="Observador firmado*"
              archivos={v.archivos}
              onChange={(a) => cambiar("archivos", a)}
              max={1}
              disabled={mut.isPending}
            />
            {error("archivos") && <FieldError>{error("archivos")}</FieldError>}
          </div>
          <Field variant="outlined" className="gap-2">
            <FieldLabel htmlFor="firmado-cargado-por">Cargado por</FieldLabel>
            <Input id="firmado-cargado-por" value={user?.name ?? ""} readOnly disabled />
          </Field>
          {(firmados.data?.length ?? 0) > 0 && (
            <div className="flex flex-col gap-2 sm:col-span-2">
              <span className="text-sm font-medium">Firmados ya cargados</span>
              <ul className="flex flex-col gap-1 text-sm">
                {(firmados.data ?? []).map((f) => (
                  <li key={f.id} className="flex items-center gap-2 rounded-md border px-3 py-1.5">
                    <span className="min-w-0 flex-1 truncate">
                      {f.periodo_nombre ?? "Sin período"} · firmado el {formatFecha(f.fecha_firma)} · {f.archivo_nombre}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      type="button"
                      aria-label={`Descargar ${f.archivo_nombre}`}
                      onClick={() => abrirArchivo(f.fk_tarchivo).catch(setErrorBackend)}
                    >
                      <FileDownloadOutlinedIcon />
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <DialogFooter className="sm:items-center">
          <p className="text-xs text-muted-foreground sm:mr-auto">Los campos marcados con * son obligatorios</p>
          <DialogClose render={<Button size="sm" type="button" variant="outline" color="neutral" />}>
            <XIcon data-icon="inline-start" />
            Cancelar
          </DialogClose>
          <Button size="sm" type="button" disabled={mut.isPending} onClick={guardar}>
            <IconoCarga cargando={mut.isPending}>
              <FileUploadOutlinedIcon data-icon="inline-start" />
            </IconoCarga>
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
