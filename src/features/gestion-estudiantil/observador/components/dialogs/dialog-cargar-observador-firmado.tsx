import { useState } from "react"

import { DatePicker } from "@/components/date-picker"
import { Alert, AlertDescription } from "@/components/ui/alert"
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
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { FileUploadOutlinedIcon, InfoIcon, XIcon } from "@/components/ui/icons"
import { Input } from "@/components/ui/input"
import { useUser } from "@/lib/auth"

import { ComboOpciones } from "@/features/gestion-estudiantil/commons/components/combo-opciones"
import { SoportesUpload } from "@/features/gestion-estudiantil/commons/components/soportes-upload"
import type { Opcion } from "@/features/gestion-estudiantil/commons/utils/opcion"

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

/**
 * «Cargar observador firmado» (guía de diseño, DCU Observador): adjunta el observador impreso y
 * firmado de un estudiante para un período.
 *
 * Solo vista: el backend todavía no expone dónde guardar el archivo, así que el modal lo dice
 * arriba y «Guardar» queda deshabilitado (no hay llamadas ni avisos de error simulados). Al existir
 * el endpoint, se conecta aquí con una mutación en `api/mutations/` (multipart vía `postMultipart`)
 * y se agrega la validación por campo.
 */
export function DialogCargarObservadorFirmado({ estudiantes, periodos, disabled }: Props) {
  const { data: user } = useUser()
  const [open, setOpen] = useState(false)
  const [v, setV] = useState<Valores>(VACIO)
  const cambiar = <K extends keyof Valores>(campo: K, valor: Valores[K]) => {
    setV((prev) => ({ ...prev, [campo]: valor }))
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(abierto) => {
        setOpen(abierto)
        if (!abierto) {
          setV(VACIO)
        }
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

        <Alert variant="info">
          <InfoIcon />
          <AlertDescription id="firmado-no-disponible">
            Vista previa: todavía no está disponible el servicio para guardar el observador firmado.
          </AlertDescription>
        </Alert>

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
            description="El período del observador que se firmó."
          />
          <Field variant="outlined" className="gap-2">
            <FieldLabel htmlFor="firmado-fecha">Fecha de la firma*</FieldLabel>
            <DatePicker
              id="firmado-fecha"
              value={v.fecha}
              onChange={(d) => cambiar("fecha", d)}
              maxDate={new Date()}
            />
            <FieldDescription>No posterior a hoy.</FieldDescription>
          </Field>
          <div className="flex flex-col gap-1 sm:col-span-2">
            <SoportesUpload
              label="Observador firmado*"
              archivos={v.archivos}
              onChange={(a) => cambiar("archivos", a)}
              max={1}
            />
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
          <Button size="sm" type="button" disabled aria-describedby="firmado-no-disponible">
            <FileUploadOutlinedIcon data-icon="inline-start" />
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
