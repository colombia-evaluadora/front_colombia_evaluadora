import { useEffect, useState, type ReactNode } from "react"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { FileUploadOutlinedIcon, SpinnerIcon, XIcon } from "@/components/ui/icons"
import { NoticeBanner } from "@/components/notice/notice-banner"
import { mensajePiar } from "@/features/gestion-estudiantil/inclusion/piar/utils/errores-piar"
import { useAppForm } from "@/lib/forms"

import { subirSoportePiar } from "@/features/gestion-estudiantil/inclusion/piar/api/mutations/piar"

export interface CampoPiar {
  name: string
  label: string
  kind: "texto" | "area" | "fecha" | "select"
  required?: boolean
  min?: number
  max?: number
  /** Con función, dependen de lo elegido en otros campos. */
  options?: { value: string; label: string }[] | ((valores: Record<string, string>) => { value: string; label: string }[])
  placeholder?: string
  /** Ocupa las dos columnas del formulario. */
  ancho?: boolean
  /** Se muestra según lo elegido en otros campos. */
  visible?: (valores: Record<string, string>) => boolean
}

export interface ArchivosPiar {
  label: string
  max: number
  required?: boolean
  /** Obligatorio según lo elegido en el formulario, con el mensaje a mostrar. */
  exigir?: (valores: Record<string, string>) => string | null
  ayuda: string
}

const TIPOS = ["application/pdf", "image/jpeg", "image/png"]
const MAX_BYTES = 10 * 1024 * 1024

function esquema(campos: CampoPiar[]) {
  return z
    .object(Object.fromEntries(campos.map((c) => [c.name, z.string()])))
    .superRefine((v, ctx) => {
      for (const c of campos) {
        if (c.visible && !c.visible(v as Record<string, string>)) continue
        const t = (v[c.name] as string).trim()
        if (c.required && !t) ctx.addIssue({ code: "custom", path: [c.name], message: `${c.label} es obligatorio.` })
        else if (t && c.min && t.length < c.min)
          ctx.addIssue({ code: "custom", path: [c.name], message: `${c.label} debe tener al menos ${c.min} caracteres.` })
      }
    })
}

interface FormDialogPiarProps {
  abierto: boolean
  titulo: string
  descripcion?: ReactNode
  campos: CampoPiar[]
  inicial?: Record<string, string | null | undefined>
  archivos?: ArchivosPiar
  confirmar: string
  confirmarColor?: "destructive"
  onClose: () => void
  /** Recibe los valores recortados y los `pk_tarchivo` ya subidos. */
  onSubmit: (valores: Record<string, string>, archivos: number[]) => Promise<unknown>
  children?: ReactNode
}

/**
 * Esqueleto de los modales del expediente: mismos campos del design system,
 * error del backend en `NoticeBanner` y pie Cancelar/Confirmar. Los archivos se
 * suben al confirmar: una subida que se cancela no deja un TARCHIVO huérfano.
 */
export function FormDialogPiar({
  abierto,
  titulo,
  descripcion,
  campos,
  inicial,
  archivos,
  confirmar,
  confirmarColor,
  onClose,
  onSubmit,
  children,
}: FormDialogPiarProps) {
  const [notice, setNotice] = useState<{ id: number; message: string } | null>(null)
  const [files, setFiles] = useState<File[]>([])
  const [pending, setPending] = useState(false)

  const defaults = Object.fromEntries(campos.map((c) => [c.name, inicial?.[c.name] ?? ""]))

  const form = useAppForm({
    defaultValues: defaults as Record<string, string>,
    validators: { onSubmit: esquema(campos) },
    onSubmit: async ({ value }) => {
      if (archivos?.required && files.length === 0) {
        setNotice({ id: Date.now(), message: `${archivos.label} es obligatorio.` })
        return
      }
      const exigido = files.length === 0 ? archivos?.exigir?.(value) : null
      if (exigido) {
        setNotice({ id: Date.now(), message: exigido })
        return
      }
      setPending(true)
      try {
        const pks = await Promise.all(files.map(subirSoportePiar))
        await onSubmit(Object.fromEntries(Object.entries(value).map(([k, v]) => [k, v.trim()])), pks)
        onClose()
      } catch (error) {
        setNotice({ id: Date.now(), message: mensajePiar(error) })
      } finally {
        setPending(false)
      }
    },
  })

  useEffect(() => {
    if (abierto) {
      form.reset(defaults)
      setFiles([])
      setNotice(null)
    }
    // Solo al abrir: `inicial` cambia de identidad en cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto])

  function agregar(lista: FileList | null) {
    const nuevos = [...(lista ?? [])]
    const malo = nuevos.find((f) => !TIPOS.includes(f.type) || f.size > MAX_BYTES)
    if (malo) {
      setNotice({ id: Date.now(), message: `${malo.name}: debe ser PDF, JPG o PNG de hasta 10 MB.` })
      return
    }
    setFiles((prev) => (archivos?.max === 1 ? nuevos.slice(0, 1) : [...prev, ...nuevos].slice(0, archivos?.max)))
  }

  return (
    <Dialog open={abierto} onOpenChange={(open) => !open && !pending && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          {descripcion && <DialogDescription render={<div />}>{descripcion}</DialogDescription>}
        </DialogHeader>
        <NoticeBanner notice={notice} onClose={() => setNotice(null)} variant="error" />
        {children}
        <form
          id="form-piar"
          className="grid gap-x-4 gap-y-5 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit()
          }}
        >
          <form.Subscribe selector={(s) => s.values}>
            {(valores) =>
              campos
                .filter((c) => !c.visible || c.visible(valores))
                .map((c) => (
                  <div key={c.name} className={c.ancho || c.kind === "area" ? "sm:col-span-2" : undefined}>
                    <form.AppField name={c.name}>
                      {(field) =>
                        c.kind === "area" ? (
                          <field.TextareaField label={c.label} required={c.required} maxLength={c.max} placeholder={c.placeholder} />
                        ) : c.kind === "fecha" ? (
                          <field.DateField label={c.label} required={c.required} />
                        ) : c.kind === "select" ? (
                          <field.SelectField label={c.label} required={c.required} options={typeof c.options === "function" ? c.options(valores) : (c.options ?? [])} placeholder="Seleccione" />
                        ) : (
                          <field.TextField label={c.label} required={c.required} maxLength={c.max} showCounter={Boolean(c.max)} placeholder={c.placeholder} />
                        )
                      }
                    </form.AppField>
                  </div>
                ))
            }
          </form.Subscribe>
        </form>
        {archivos && (
          <div className="grid gap-2">
            <span className="text-sm font-medium">
              {archivos.label}
              {archivos.required && "*"}
            </span>
            {files.map((f) => (
              <div key={f.name} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                <span className="truncate">
                  {f.name} <span className="text-muted-foreground">· {Math.max(1, Math.round(f.size / 1024))} KB</span>
                </span>
                <Button
                  size="icon-sm"
                  type="button"
                  variant="ghost"
                  color="muted"
                  aria-label={`Quitar ${f.name}`}
                  onClick={() => setFiles((prev) => prev.filter((x) => x !== f))}
                >
                  <XIcon />
                </Button>
              </div>
            ))}
            <div className="flex items-center gap-3">
              <Button size="sm" type="button" variant="outline" color="muted" render={<label />} nativeButton={false} disabled={files.length >= archivos.max && archivos.max > 1}>
                <FileUploadOutlinedIcon data-icon="inline-start" />
                {files.length && archivos.max === 1 ? "Cambiar" : "Cargar"}
                <input
                  type="file"
                  className="sr-only"
                  accept=".pdf,.jpg,.jpeg,.png"
                  multiple={archivos.max > 1}
                  onChange={(e) => {
                    agregar(e.target.files)
                    e.target.value = ""
                  }}
                />
              </Button>
              <span className="text-xs text-muted-foreground">{archivos.ayuda}</span>
            </div>
          </div>
        )}
        <p className="text-xs text-muted-foreground">Los campos marcados con * son obligatorios</p>
        <DialogFooter>
          <DialogClose render={<Button size="sm" type="button" variant="outline" color="muted" />}>Cancelar</DialogClose>
          <Button size="sm" type="submit" form="form-piar" color={confirmarColor} disabled={pending}>
            {pending && <SpinnerIcon data-icon="inline-start" className="animate-spin" />}
            {confirmar}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
