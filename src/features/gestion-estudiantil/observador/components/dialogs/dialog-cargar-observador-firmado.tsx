import { useState } from "react"

import { DatePicker } from "@/components/date-picker"
import { NoticeBanner, type Notice } from "@/components/notice/notice-banner"
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
import { FileUploadOutlinedIcon, XIcon } from "@/components/ui/icons"
import { Input } from "@/components/ui/input"
import { useUser } from "@/lib/auth"

import { ComboOpciones } from "@/features/gestion-estudiantil/commons/components/combo-opciones"
import { SoportesUpload } from "@/features/gestion-estudiantil/commons/components/soportes-upload"
import type { Opcion } from "@/features/gestion-estudiantil/commons/utils/opcion"

interface Props {
  /** Estudiantes elegibles («Nombre · Grado/Grupo»). */
  estudiantes: Opcion[]
  periodos: Opcion[]
}

interface Valores {
  estudiante: string
  periodo: string
  fecha: Date | undefined
  archivos: File[]
}

const VACIO: Valores = { estudiante: "", periodo: "", fecha: undefined, archivos: [] }

type Errores = Partial<Record<keyof Valores, string>>

function validar(v: Valores): Errores {
  const e: Errores = {}
  if (!v.estudiante) e.estudiante = "Elija el estudiante."
  if (!v.periodo) e.periodo = "Elija el período."
  if (!v.fecha) e.fecha = "Indique la fecha de la firma."
  else if (v.fecha > new Date()) e.fecha = "La fecha no puede ser posterior a hoy."
  if (!v.archivos.length) e.archivos = "Adjunte el observador firmado."
  return e
}

/**
 * «Cargar observador firmado» (guía de diseño, DCU Observador): adjunta el observador impreso y
 * firmado de un estudiante para un período.
 *
 * Solo vista: el backend todavía no expone dónde guardar el archivo, así que «Guardar» valida el
 * formulario y avisa que el servicio no está disponible. Al existir el endpoint, se conecta aquí
 * con una mutación en `api/mutations/` (multipart vía `postMultipart`).
 */
export function DialogCargarObservadorFirmado({ estudiantes, periodos }: Props) {
  const { data: user } = useUser()
  const [open, setOpen] = useState(false)
  const [v, setV] = useState<Valores>(VACIO)
  const [errores, setErrores] = useState<Errores>({})
  const [notice, setNotice] = useState<Notice | null>(null)

  const cambiar = <K extends keyof Valores>(campo: K, valor: Valores[K]) => {
    setV((prev) => ({ ...prev, [campo]: valor }))
    setErrores((prev) => ({ ...prev, [campo]: undefined }))
  }

  const guardar = () => {
    const e = validar(v)
    setErrores(e)
    if (Object.keys(e).length) return
    setNotice({
      id: Date.now(),
      message: "Todavía no está disponible el servicio para guardar el observador firmado.",
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(abierto) => {
        setOpen(abierto)
        if (!abierto) {
          setV(VACIO)
          setErrores({})
          setNotice(null)
        }
      }}
    >
      <DialogTrigger render={<Button size="sm" variant="outline" color="muted" />}>
        <FileUploadOutlinedIcon data-icon="inline-start" />
        Cargar observador firmado
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Cargar observador firmado</DialogTitle>
        </DialogHeader>

        <NoticeBanner notice={notice} onClose={() => setNotice(null)} variant="warning" />

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
            onChange={(x) => cambiar("estudiante", x)}
            error={errores.estudiante}
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
            onChange={(x) => cambiar("periodo", x)}
            error={errores.periodo}
            description="El período del observador que se firmó."
          />
          <Field variant="outlined" className="gap-2" data-invalid={Boolean(errores.fecha) || undefined}>
            <FieldLabel htmlFor="firmado-fecha">Fecha de la firma*</FieldLabel>
            <DatePicker
              id="firmado-fecha"
              value={v.fecha}
              onChange={(d) => cambiar("fecha", d)}
              maxDate={new Date()}
              aria-invalid={Boolean(errores.fecha) || undefined}
            />
            {errores.fecha ? (
              <FieldError>{errores.fecha}</FieldError>
            ) : (
              <FieldDescription>No posterior a hoy.</FieldDescription>
            )}
          </Field>
          <div className="flex flex-col gap-1 sm:col-span-2">
            <SoportesUpload
              label="Observador firmado*"
              archivos={v.archivos}
              onChange={(a) => cambiar("archivos", a)}
              max={1}
            />
            {errores.archivos && (
              <p role="alert" className="text-xs text-red">
                {errores.archivos}
              </p>
            )}
          </div>
          <Field variant="outlined" className="gap-2">
            <FieldLabel htmlFor="firmado-cargado-por">Cargado por</FieldLabel>
            <Input id="firmado-cargado-por" value={user?.name ?? ""} readOnly disabled />
          </Field>
        </div>

        <DialogFooter className="sm:items-center">
          <p className="text-xs text-muted-foreground sm:mr-auto">Los campos marcados con * son obligatorios</p>
          <DialogClose render={<Button size="sm" type="button" variant="outline" color="neutral" />}>
            <XIcon data-icon="inline-start" />
            Cancelar
          </DialogClose>
          <Button size="sm" type="button" onClick={guardar}>
            <FileUploadOutlinedIcon data-icon="inline-start" />
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
