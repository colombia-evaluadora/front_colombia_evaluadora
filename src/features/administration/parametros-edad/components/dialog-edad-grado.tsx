import { useState } from "react"

import { ConfirmDiscardDialog } from "@/components/confirm-discard-dialog"
import { NoticeBanner } from "@/components/notice/notice-banner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { FloppyDiskIcon, SpinnerIcon, XIcon } from "@/components/ui/icons"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { getErrorMessage } from "@/lib/api-client"
import { toDigitsOnly } from "@/lib/text-input"
import { useGuardedDialog } from "@/features/establishment/academic-period/hooks/use-guarded-dialog"

import type { ListaValor } from "@/features/administration/listas-valor/api/types/lista-valor"
import {
  CORTES,
  EDAD_MAX,
  EDAD_MIN,
  formatDiferencia,
  validarCortes,
  type Cortes,
  type CortesGrado,
  type EdadGrado,
} from "@/features/administration/parametros-edad/api/types"
import { EscalaSituacion } from "@/features/administration/parametros-edad/components/escala-situacion"
import {
  ErrorCampo,
  InputCorte,
  SelectFila,
} from "@/features/administration/parametros-edad/components/tabla-parametros"

const FORM_ID = "form-edad-grado"

type Modo = "defecto" | "propios"

interface Borrador {
  grado: string
  edad: string
  modo: Modo
  cortes: Record<keyof Cortes, string>
}

interface Errores {
  grado?: string
  edad?: string
  cortes?: string
}

/** Estado inicial: la fila a modificar o un alta vacía con los cortes por defecto. */
function inicial(fila: EdadGrado | null, defecto: Cortes): Borrador {
  const propios = fila != null && CORTES.some((c) => fila[c.campo] != null)
  return {
    grado: fila?.grado ?? "",
    edad: fila ? String(fila.edad) : "",
    modo: propios ? "propios" : "defecto",
    // Al pasar a propios se parte de lo que rige hoy, no de campos vacíos.
    cortes: Object.fromEntries(
      CORTES.map((c) => [c.campo, String(fila?.[c.campo] ?? defecto[c.campo])]),
    ) as Borrador["cortes"],
  }
}

const iguales = (a: Borrador, b: Borrador) => JSON.stringify(a) === JSON.stringify(b)

/** Cortes escritos si los tres son números; si no, null. */
function leerCortes(b: Borrador): Cortes | null {
  if (CORTES.some((c) => b.cortes[c.campo] === "" || b.cortes[c.campo] === "-")) return null
  return {
    bajaEdadHasta: Number(b.cortes.bajaEdadHasta),
    preextraedadDesde: Number(b.cortes.preextraedadDesde),
    extraedadDesde: Number(b.cortes.extraedadDesde),
  }
}

/**
 * Agregar o modificar la edad recomendada de un grado y sus cortes. La regla
 * muestra, con las edades del grado, cómo quedará clasificado un aspirante.
 */
export function DialogEdadGrado({
  open,
  fila,
  opciones,
  defecto,
  guardando,
  onOpenChange,
  onGuardar,
}: {
  open: boolean
  /** null = alta. */
  fila: EdadGrado | null
  /** Grados que aún no tienen edad (solo para el alta). */
  opciones: ListaValor[]
  defecto: Cortes
  guardando: boolean
  onOpenChange: (open: boolean) => void
  onGuardar: (grado: string, edad: number, cortes: CortesGrado, nuevo: boolean) => Promise<unknown>
}) {
  // El padre monta el diálogo con `key` por fila: el estado nace con cada apertura.
  const [inicio] = useState(() => inicial(fila, defecto))
  const [borrador, setBorrador] = useState(inicio)
  const [errores, setErrores] = useState<Errores>({})
  const [errorGuardar, setErrorGuardar] = useState<string | null>(null)

  const nuevo = fila == null
  const nombre = fila?.nombre ?? opciones.find((o) => String(o.pkListaValor) === borrador.grado)?.nombre

  const edad = Number(borrador.edad)
  const edadValida = borrador.edad !== "" && edad >= EDAD_MIN && edad <= EDAD_MAX
  const escritos = borrador.modo === "propios" ? leerCortes(borrador) : defecto
  // La regla sigue lo escrito mientras sea válido; si no, se queda con lo que rige.
  const vista = escritos && !validarCortes(escritos) ? escritos : defecto

  function cambiar(parcial: Partial<Borrador>, campo?: keyof Errores) {
    setBorrador((p) => ({ ...p, ...parcial }))
    if (campo) setErrores((e) => ({ ...e, [campo]: undefined }))
    setErrorGuardar(null)
  }

  const { confirmDiscardOpen, requestClose, onOpenChange: guardedOpenChange, discardDialogProps } =
    useGuardedDialog({
      isSaving: guardando,
      isDirty: () => !iguales(borrador, inicio),
      onOpen: () => {},
      onClose: () => onOpenChange(false),
    })

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    const nuevosErrores: Errores = {}
    if (nuevo && !borrador.grado) nuevosErrores.grado = "Seleccione el grado."
    if (!edadValida) nuevosErrores.edad = `La edad debe estar entre ${EDAD_MIN} y ${EDAD_MAX} años.`
    if (borrador.modo === "propios") {
      nuevosErrores.cortes = escritos
        ? (validarCortes(escritos) ?? undefined)
        : "Complete los tres cortes."
    }
    setErrores(nuevosErrores)
    if (Object.values(nuevosErrores).some(Boolean)) return
    if (iguales(borrador, inicio)) return onOpenChange(false)

    // En "por defecto" se mandan null: el grado sigue a los cortes por defecto si cambian.
    const cortes: CortesGrado =
      borrador.modo === "propios"
        ? escritos!
        : { bajaEdadHasta: null, preextraedadDesde: null, extraedadDesde: null }
    try {
      await onGuardar(borrador.grado, edad, cortes, nuevo)
      onOpenChange(false)
    } catch (err) {
      setErrorGuardar(getErrorMessage(err))
    }
  }

  return (
    <Dialog open={open} onOpenChange={guardedOpenChange}>
      <DialogContent className="sm:max-w-2xl" inert={confirmDiscardOpen}>
        <DialogHeader>
          <DialogTitle>
            {nuevo ? "Agregar edad recomendada" : `Modificar edad recomendada de ${fila.nombre}`}
          </DialogTitle>
          <DialogDescription>
            La situación de edad compara la edad cumplida a la fecha de corte con la edad
            recomendada del grado.
          </DialogDescription>
        </DialogHeader>

        <NoticeBanner
          variant="error"
          notice={errorGuardar ? { id: 0, message: errorGuardar } : null}
          onClose={() => setErrorGuardar(null)}
        />

        <form id={FORM_ID} onSubmit={guardar} className="flex flex-col gap-6">
          <div className="flex flex-wrap items-start gap-x-6 gap-y-4">
            {nuevo && (
              <div className="flex min-w-56 flex-1 flex-col gap-1">
                <span className="text-sm">
                  Grado<span className="text-red"> *</span>
                </span>
                <SelectFila
                  label="Grado"
                  placeholder="Seleccione el grado"
                  className="h-9 max-w-none"
                  opciones={opciones.map((o) => ({ value: String(o.pkListaValor), label: o.nombre }))}
                  value={borrador.grado}
                  onChange={(v) => cambiar({ grado: v }, "grado")}
                />
                <ErrorCampo mensaje={errores.grado ?? null} />
              </div>
            )}
            <label className="flex flex-col gap-1">
              <span className="text-sm">
                Edad recomendada<span className="text-red"> *</span>
              </span>
              <span className="flex items-center gap-2">
                <Input
                  inputMode="numeric"
                  autoFocus={!nuevo}
                  aria-invalid={Boolean(errores.edad)}
                  variant="outlined"
                  className="h-9 w-20 text-right tabular-nums"
                  value={borrador.edad}
                  onChange={(e) => cambiar({ edad: toDigitsOnly(e.target.value, 2) }, "edad")}
                />
                <span className="text-sm text-muted-foreground">años</span>
              </span>
              <ErrorCampo mensaje={errores.edad ?? null} />
            </label>
          </div>

          <fieldset className="flex flex-col gap-3">
            <legend className="mb-2 text-sm">Cortes de la situación de edad</legend>
            <RadioGroup
              className="flex flex-col gap-2"
              value={borrador.modo}
              onValueChange={(v) => cambiar({ modo: v as Modo }, "cortes")}
            >
              <label className="flex items-center gap-2 text-sm">
                <RadioGroupItem value="defecto" />
                Usar los cortes por defecto
                <span className="text-muted-foreground tabular-nums">
                  ({CORTES.map((c) => formatDiferencia(defecto[c.campo])).join(" / ")} años)
                </span>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <RadioGroupItem value="propios" />
                Definir cortes propios para este grado
              </label>
            </RadioGroup>

            {borrador.modo === "propios" && (
              <div className="flex flex-col gap-2 pl-6">
                <div className="grid gap-3 sm:grid-cols-3">
                  {CORTES.map((c) => (
                    <label key={c.campo} className="flex items-center justify-between gap-3 text-sm">
                      {c.label}
                      <InputCorte
                        label={c.label}
                        invalido={Boolean(errores.cortes)}
                        value={borrador.cortes[c.campo]}
                        onChange={(v) =>
                          cambiar({ cortes: { ...borrador.cortes, [c.campo]: v } }, "cortes")
                        }
                      />
                    </label>
                  ))}
                </div>
                <ErrorCampo mensaje={errores.cortes ?? null} />
              </div>
            )}
          </fieldset>

          <section aria-labelledby="vista-previa" className="flex flex-col gap-2">
            <h3 id="vista-previa" className="text-sm font-medium">
              {edadValida
                ? `Edad cumplida de un aspirante${nombre ? ` de ${nombre}` : ""}`
                : "Diferencia con la edad recomendada"}
            </h3>
            {edadValida ? (
              <EscalaSituacion cortes={vista} edad={edad} />
            ) : (
              <EscalaSituacion cortes={vista} />
            )}
          </section>
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" color="neutral" onClick={requestClose}>
            <XIcon data-icon="inline-start" />
            Cancelar
          </Button>
          <Button
            type="submit"
            color="primary"
            form={FORM_ID}
            disabled={guardando}
            aria-busy={guardando}
          >
            {guardando ? (
              <SpinnerIcon data-icon="inline-start" className="animate-spin" />
            ) : (
              <FloppyDiskIcon data-icon="inline-start" />
            )}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
      <ConfirmDiscardDialog {...discardDialogProps} />
    </Dialog>
  )
}
