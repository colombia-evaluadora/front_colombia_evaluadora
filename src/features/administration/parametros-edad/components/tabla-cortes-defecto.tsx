import { useState } from "react"

import { Button } from "@/components/ui/button"
import { CheckIcon, PencilIcon, SpinnerIcon } from "@/components/ui/icons"

import {
  CORTES,
  validarCortes,
  type Cortes,
} from "@/features/administration/parametros-edad/api/types"
import { EscalaSituacion } from "@/features/administration/parametros-edad/components/escala-situacion"
import {
  ErrorCampo,
  InputCorte,
} from "@/features/administration/parametros-edad/components/tabla-parametros"

type Borrador = Record<keyof Cortes, string>

const aBorrador = (c: Cortes): Borrador => ({
  bajaEdadHasta: String(c.bajaEdadHasta),
  preextraedadDesde: String(c.preextraedadDesde),
  extraedadDesde: String(c.extraedadDesde),
})

/** Cortes del borrador si los tres son números; si no, null. */
function leer(b: Borrador): Cortes | null {
  if (CORTES.some((c) => b[c.campo] === "" || b[c.campo] === "-")) return null
  return {
    bajaEdadHasta: Number(b.bajaEdadHasta),
    preextraedadDesde: Number(b.preextraedadDesde),
    extraedadDesde: Number(b.extraedadDesde),
  }
}

/**
 * Cortes por defecto: un solo registro, siempre visible, que solo se modifica.
 * Se muestra como la regla de la situación de edad; al editar, la regla sigue
 * los valores escritos mientras sean válidos.
 */
export function TablaCortesDefecto({
  cortes,
  puedeEditar,
  guardando,
  onGuardar,
}: {
  cortes: Cortes
  puedeEditar: boolean
  guardando: boolean
  onGuardar: (cortes: Cortes) => Promise<unknown>
}) {
  const [borrador, setBorrador] = useState<Borrador | null>(null)
  const [error, setError] = useState<string | null>(null)

  const escritos = borrador && leer(borrador)
  const vista = escritos && !validarCortes(escritos) ? escritos : cortes

  function cancelar() {
    setBorrador(null)
    setError(null)
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    if (!borrador) return
    const nuevos = leer(borrador)
    if (!nuevos) return setError("Los tres cortes son obligatorios.")
    if (CORTES.every((c) => nuevos[c.campo] === cortes[c.campo])) return cancelar()
    const mensaje = validarCortes(nuevos)
    if (mensaje) return setError(mensaje)
    try {
      await onGuardar(nuevos)
      cancelar()
    } catch {
      // El aviso lo muestra la mutación; la edición sigue abierta para corregir.
    }
  }

  return (
    <form
      onSubmit={guardar}
      aria-labelledby="cortes-defecto"
      className="flex flex-col gap-4 rounded-md border p-4"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 id="cortes-defecto" className="text-base font-semibold">
            Cortes por defecto
          </h2>
          <p className="max-w-prose text-sm text-muted-foreground">
            Años de diferencia entre la edad cumplida a la fecha de corte y la edad recomendada del
            grado. Rigen para los grados sin cortes propios.
          </p>
        </div>
        {borrador ? (
          <div className="flex shrink-0 gap-2">
            <Button type="button" variant="outline" size="sm" disabled={guardando} onClick={cancelar}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={guardando} aria-busy={guardando}>
              {guardando ? (
                <SpinnerIcon data-icon="inline-start" className="animate-spin" />
              ) : (
                <CheckIcon data-icon="inline-start" />
              )}
              Guardar cortes
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0"
            disabled={!puedeEditar}
            onClick={() => setBorrador(aBorrador(cortes))}
          >
            <PencilIcon data-icon="inline-start" />
            Modificar
          </Button>
        )}
      </div>

      <EscalaSituacion cortes={vista} />

      {borrador && (
        <div className="flex flex-col gap-2">
          <div className="grid gap-3 sm:grid-cols-3">
            {CORTES.map((c, i) => (
              <label key={c.campo} className="flex items-center justify-between gap-3 text-sm">
                {c.label}
                <InputCorte
                  label={c.label}
                  autoFocus={i === 0}
                  invalido={Boolean(error)}
                  value={borrador[c.campo]}
                  onChange={(v) => {
                    setError(null)
                    setBorrador((p) => p && { ...p, [c.campo]: v })
                  }}
                />
              </label>
            ))}
          </div>
          <ErrorCampo mensaje={error} />
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Preextraedad es una señal de contexto: no genera aviso. Si falta la edad del grado o la fecha
        de corte del calendario, la situación queda Sin calcular.
      </p>
    </form>
  )
}
