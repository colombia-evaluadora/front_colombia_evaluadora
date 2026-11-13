import { useState, type ReactNode } from "react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea, TEXTAREA_OUTLINED } from "@/components/ui/textarea"
import { CharacterCounter } from "@/components/ui/character-counter"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import {
  FileUpload,
  FileUploadDropzone,
  FileUploadItem,
  FileUploadItemDelete,
  FileUploadItemMetadata,
  FileUploadItemPreview,
  FileUploadList,
} from "@/components/ui/file-upload"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DatePicker } from "@/components/date-picker"
import { FileUploadOutlinedIcon, FloppyDiskIcon, SpinnerIcon, XIcon } from "@/components/ui/icons"
import { NoticeBanner } from "@/components/notice/notice-banner"
import { toSelectItemsMap } from "@/lib/catalog-options"
import { formatDateValue, parseDateValue } from "@/lib/date-value"
import { getErrorMessage } from "@/lib/api-client"
import { cn } from "@/lib/utils"
import { toDigitsOnly, toLettersOnly } from "@/lib/text-input"

import { useMatriculaCatalogQuery } from "@/features/coverage/matricula/api/query/use-matricula-catalog-select"
import { useEtniasQuery } from "@/features/establishment/institution/api/query/use-etnias"
import { useCorregirIdentidadEstudiante } from "@/features/coverage/matricula/api/mutations/corregir-identidad-estudiante"
import type { MatriculaStudentInfo } from "@/features/coverage/matricula/api/types/matricula"
import type { DepartmentOption } from "@/features/coverage/matricula/components/forms/form-create-matricula"

const SOPORTE_EXTENSIONES = ["pdf", "jpg", "jpeg", "png"]
const SOPORTE_MAX_MB = 10
const MOTIVO_MIN = 10
const MOTIVO_MAX = 500

const OBLIGATORIOS: (keyof Identidad)[] = ["documentType", "documentNumber", "firstName", "lastName", "birthDate", "gender"]
const DOCUMENTO_MIN = 3
const EDAD_MAX = 100

/** Mensaje de error del campo, o null si es válido. */
function errorDe(key: keyof Identidad, value: string): string | null {
  const v = value.trim()
  if (!v) return OBLIGATORIOS.includes(key) ? "Campo obligatorio." : null
  if (key === "documentNumber" && v.length < DOCUMENTO_MIN) return `Mínimo ${DOCUMENTO_MIN} dígitos.`
  if (key === "birthDate") {
    const fecha = new Date(`${v}T00:00:00`)
    const hoy = new Date()
    if (fecha > hoy) return "No puede ser una fecha futura."
    if (hoy.getFullYear() - fecha.getFullYear() > EDAD_MAX) return `No puede tener más de ${EDAD_MAX} años.`
  }
  return null
}

interface Identidad {
  documentType: string
  documentNumber: string
  firstName: string
  secondName: string
  lastName: string
  secondLastName: string
  birthDate: string
  birthMunicipality: string
  documentMunicipality: string
  gender: string
  ethnicity: string
}

const fromStudent = (s: MatriculaStudentInfo): Identidad => ({
  documentType: s.documentType,
  documentNumber: s.documentNumber,
  firstName: s.firstName,
  secondName: s.secondName,
  lastName: s.lastName,
  secondLastName: s.secondLastName,
  birthDate: s.birthDate,
  birthMunicipality: s.birthPlace.municipality,
  documentMunicipality: s.documentExpedition.municipality,
  gender: s.gender,
  ethnicity: s.ethnicity,
})

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  matriculaId: string
  student: MatriculaStudentInfo
  departments: DepartmentOption[]
  /** Con los datos ya guardados, para que el formulario de edición los muestre. */
  onCorrected: (student: MatriculaStudentInfo) => void
}

/**
 * Corregir datos de identidad (Regla 43; prototipo C.1.EDI): una fila por dato con
 * el anterior y el nuevo. Lo que cambia se resalta; motivo y soporte obligatorios.
 */
export function DialogCorregirIdentidadEstudiante({ open, onOpenChange, matriculaId, student, departments, onCorrected }: Props) {
  const anterior = fromStudent(student)
  const [nuevo, setNuevo] = useState<Identidad>(anterior)
  const [motivo, setMotivo] = useState("")
  const [soporte, setSoporte] = useState<File | null>(null)
  const [intentado, setIntentado] = useState(false)
  const [error, setError] = useState<{ id: number; message: string } | null>(null)
  const corregir = useCorregirIdentidadEstudiante()

  const { data: tipoDocumento } = useMatriculaCatalogQuery("tipoDocumento")
  const { data: genero } = useMatriculaCatalogQuery("genero")
  const { data: etnias } = useEtniasQuery()

  const tipos = (tipoDocumento ?? []).map((t) => ({ value: String(t.id), label: t.nombre }))
  const generos = (genero ?? []).map((g) => ({ value: String(g.id), label: g.nombre }))
  const etniasOpts = (etnias ?? []).map((e) => ({ value: String(e.id), label: e.name }))
  // Un solo selector de municipio (Regla 4): el municipio ya trae su departamento.
  const municipios = departments.flatMap((d) =>
    d.municipalities.map((m) => ({ value: String(m.id), label: m.name, hint: d.name })),
  )

  const set = <K extends keyof Identidad>(key: K, value: Identidad[K]) => setNuevo((prev) => ({ ...prev, [key]: value }))
  const labelOf = (options: { value: string; label: string }[], value: string) =>
    options.find((o) => o.value === value)?.label ?? (value ? value : "—")

  const cambiados = (Object.keys(nuevo) as (keyof Identidad)[]).filter((k) => nuevo[k].trim() !== anterior[k].trim())
  const motivoValido = motivo.trim().length >= MOTIVO_MIN && motivo.trim().length <= MOTIVO_MAX
  const errores = Object.fromEntries(
    (Object.keys(nuevo) as (keyof Identidad)[]).map((k) => [k, errorDe(k, nuevo[k])]),
  ) as Record<keyof Identidad, string | null>
  const hayErrores = Object.values(errores).some(Boolean)
  const invalido = (k: keyof Identidad) => intentado && Boolean(errores[k])

  function elegirSoporte(file: File | undefined) {
    if (!file) return
    const ext = file.name.split(".").pop()?.toLowerCase() ?? ""
    if (!SOPORTE_EXTENSIONES.includes(ext)) {
      setError({ id: Date.now(), message: "El soporte debe ser un archivo PDF, JPG o PNG." })
      return
    }
    if (file.size > SOPORTE_MAX_MB * 1024 * 1024) {
      setError({ id: Date.now(), message: `El soporte supera los ${SOPORTE_MAX_MB} MB.` })
      return
    }
    setSoporte(file)
  }

  function guardar() {
    setIntentado(true)
    if (cambiados.length === 0) {
      setError({ id: Date.now(), message: "No hay cambios en los datos de identidad." })
      return
    }
    if (hayErrores || !motivoValido || !soporte) return
    corregir.mutate(
      {
        matriculaId,
        documentTypeId: nuevo.documentType,
        documentNumber: nuevo.documentNumber,
        firstName: nuevo.firstName,
        secondName: nuevo.secondName,
        lastName: nuevo.lastName,
        secondLastName: nuevo.secondLastName,
        birthDate: nuevo.birthDate,
        birthMunicipalityId: nuevo.birthMunicipality,
        documentMunicipalityId: nuevo.documentMunicipality,
        genderId: nuevo.gender,
        ethnicityId: nuevo.ethnicity,
        reason: motivo,
        support: soporte,
      },
      {
        onSuccess: () => {
          const municipioDe = (id: string) => departments.find((d) => d.municipalities.some((m) => String(m.id) === id))?.name ?? ""
          onCorrected({
            ...student,
            documentType: nuevo.documentType,
            documentNumber: nuevo.documentNumber.trim(),
            firstName: nuevo.firstName.trim(),
            secondName: nuevo.secondName.trim(),
            lastName: nuevo.lastName.trim(),
            secondLastName: nuevo.secondLastName.trim(),
            birthDate: nuevo.birthDate,
            birthPlace: { department: municipioDe(nuevo.birthMunicipality), municipality: nuevo.birthMunicipality },
            documentExpedition: { department: municipioDe(nuevo.documentMunicipality), municipality: nuevo.documentMunicipality },
            gender: nuevo.gender,
            ethnicity: nuevo.ethnicity,
          })
        },
        onError: (err) => setError({ id: Date.now(), message: getErrorMessage(err) }),
      },
    )
  }

  const nombre = [student.firstName, student.secondName, student.lastName, student.secondLastName].filter(Boolean).join(" ")

  const select = (key: keyof Identidad, label: string, options: { value: string; label: string }[], clearable = false) => (
    <Select items={toSelectItemsMap(options)} value={nuevo[key] || null} onValueChange={(v) => set(key, (v as string) ?? "")}>
      <SelectTrigger variant="outlined" size="sm" aria-label={label} aria-invalid={invalido(key)} className="w-full">
        <SelectValue placeholder="Seleccionar" />
      </SelectTrigger>
      <SelectContent>
        {clearable ? <SelectItem value={null}>Sin dato</SelectItem> : null}
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
  const text = (key: keyof Identidad, label: string, max: number, numeric = false) => (
    <Input
      aria-label={label}
      size="sm"
      variant="outlined"
      value={nuevo[key]}
      maxLength={max}
      inputMode={numeric ? "numeric" : undefined}
      aria-invalid={invalido(key)}
      onChange={(e) => set(key, numeric ? toDigitsOnly(e.target.value, max) : toLettersOnly(e.target.value, max))}
    />
  )

  const filas: { key: keyof Identidad; campo: string; anterior: string; control: ReactNode }[] = [
    { key: "documentType", campo: "Tipo de documento del estudiante", anterior: labelOf(tipos, anterior.documentType), control: select("documentType", "Tipo de documento", tipos) },
    { key: "documentNumber", campo: "Documento estudiante", anterior: anterior.documentNumber, control: text("documentNumber", "Documento", 15, true) },
    { key: "firstName", campo: "Nombre del estudiante", anterior: anterior.firstName, control: text("firstName", "Nombre", 40) },
    { key: "secondName", campo: "Segundo nombre del estudiante", anterior: anterior.secondName || "—", control: text("secondName", "Segundo nombre", 40) },
    { key: "lastName", campo: "Primer apellido del estudiante", anterior: anterior.lastName, control: text("lastName", "Primer apellido", 40) },
    { key: "secondLastName", campo: "Segundo apellido del estudiante", anterior: anterior.secondLastName || "—", control: text("secondLastName", "Segundo apellido", 40) },
    {
      key: "birthDate",
      campo: "Fecha de nacimiento",
      anterior: anterior.birthDate ? anterior.birthDate.split("-").reverse().join("/") : "—",
      control: (
        <DatePicker
          mode="date"
          size="sm"
          variant="outlined"
          aria-invalid={invalido("birthDate")}
          value={parseDateValue(nuevo.birthDate)}
          maxDate={new Date()}
          onChange={(d) => set("birthDate", formatDateValue(d))}
        />
      ),
    },
    { key: "birthMunicipality", campo: "Lugar de nacimiento (municipio)", anterior: labelOf(municipios, anterior.birthMunicipality), control: select("birthMunicipality", "Lugar de nacimiento", municipios, true) },
    { key: "documentMunicipality", campo: "Lugar expedición documento estudiante (municipio)", anterior: labelOf(municipios, anterior.documentMunicipality), control: select("documentMunicipality", "Lugar de expedición", municipios, true) },
    { key: "gender", campo: "Género del estudiante", anterior: labelOf(generos, anterior.gender), control: select("gender", "Género", generos) },
    { key: "ethnicity", campo: "Etnia/Resguardo", anterior: labelOf(etniasOpts, anterior.ethnicity), control: select("ethnicity", "Etnia/Resguardo", etniasOpts, true) },
  ]

  return (
    <Dialog open={open} onOpenChange={(next) => !corregir.isPending && onOpenChange(next)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Corregir datos de identidad — {nombre}</DialogTitle>
        </DialogHeader>
        <NoticeBanner notice={error} onClose={() => setError(null)} variant="error" />

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/40 text-left">
                <th className="px-2 py-2 font-medium">Campo</th>
                <th className="px-2 py-2 font-medium">Dato anterior</th>
                <th className="px-2 py-2 font-medium">Dato nuevo</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((fila) => {
                const cambio = cambiados.includes(fila.key)
                return (
                  <tr key={fila.key} className={cn("border-b border-border", cambio && "bg-primary-22")}>
                    <td className="px-2 py-1 align-middle">{fila.campo}</td>
                    <td className={cn("px-2 py-1 align-middle", cambio ? "font-semibold" : "text-muted-foreground")}>
                      {fila.anterior}
                    </td>
                    <td className="w-[45%] px-2 py-1 align-middle">
                      {fila.control}
                      {invalido(fila.key) && <p className="mt-1 text-xs text-red">{errores[fila.key]}</p>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <Field variant="outlined" data-invalid={intentado && !motivoValido}>
          <FieldLabel htmlFor="correccion-motivo">Motivo*</FieldLabel>
          <div className="relative">
            <Textarea
              id="correccion-motivo"
              rows={2}
              maxLength={MOTIVO_MAX}
              value={motivo}
              placeholder="Agregar"
              aria-invalid={intentado && !motivoValido}
              className={cn(TEXTAREA_OUTLINED, "pr-16")}
              onChange={(e) => setMotivo(e.target.value)}
            />
            <CharacterCounter value={motivo} max={MOTIVO_MAX} className="absolute top-3 right-3" />
          </div>
          <FieldDescription className={cn(intentado && !motivoValido && "text-red")}>
            Entre {MOTIVO_MIN} y {MOTIVO_MAX} caracteres.
          </FieldDescription>
        </Field>

        <FileUpload
          value={soporte ? [soporte] : []}
          onValueChange={(files) => (files.length ? elegirSoporte(files[0]) : setSoporte(null))}
          accept=".pdf,.jpg,.jpeg,.png"
          maxFiles={1}
          invalid={intentado && !soporte}
          label="Soporte de la corrección"
        >
          {!soporte && (
            <FileUploadDropzone className={cn("flex-col gap-1 p-4 text-center", intentado && "border-red")}>
              <FileUploadOutlinedIcon aria-hidden className="size-5 text-muted-foreground" />
              <p className="text-sm font-medium">Soporte *</p>
              <p className="text-xs text-muted-foreground">1 archivo PDF, JPG o PNG · máx. {SOPORTE_MAX_MB} MB.</p>
            </FileUploadDropzone>
          )}
          <FileUploadList>
            {soporte && (
              <FileUploadItem value={soporte}>
                <FileUploadItemPreview />
                <FileUploadItemMetadata />
                <FileUploadItemDelete />
              </FileUploadItem>
            )}
          </FileUploadList>
        </FileUpload>
        {intentado && !soporte && <p className="-mt-2 text-xs text-red">Adjunte el soporte de la corrección.</p>}

        <DialogFooter>
          <Button type="button" variant="outline" color="neutral" size="sm" onClick={() => onOpenChange(false)}>
            <XIcon data-icon="inline-start" />
            Cancelar
          </Button>
          <Button type="button" variant="fill" color="primary" size="sm" disabled={corregir.isPending} onClick={guardar}>
            {corregir.isPending ? (
              <SpinnerIcon data-icon="inline-start" className="animate-spin" />
            ) : (
              <FloppyDiskIcon data-icon="inline-start" />
            )}
            Guardar corrección
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
