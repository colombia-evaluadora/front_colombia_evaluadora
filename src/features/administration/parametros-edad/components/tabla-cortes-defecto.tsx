import { useState } from "react"

import { TituloConAyuda } from "@/components/titulo-con-ayuda"
import { Button } from "@/components/ui/button"
import { PencilIcon } from "@/components/ui/icons"

import {
  CORTES,
  validarCortes,
  type Cortes,
} from "@/features/administration/parametros-edad/api/types"
import { EscalaSituacion } from "@/features/administration/parametros-edad/components/escala-situacion"
import {
  AccionesFila,
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
            <TituloConAyuda
              titulo="Cortes por defecto"
              ayuda="Un solo registro que rige para los grados sin cortes propios. Debe cumplir Baja edad < 0 < Preextraedad < Extraedad. Lo fija la entidad territorial al validar su metodología."
            />
          </h2>
          <p className="max-w-prose text-sm text-muted-foreground">
            Años de diferencia entre la edad cumplida a la fecha de corte y la edad recomendada del
            grado. Rigen para los grados sin cortes propios.
          </p>
        </div>
        {/* Al modificar, Cancelar y Guardar van junto a los campos, como en las filas de las tablas. */}
        {!borrador && (
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

      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-medium">
          <TituloConAyuda
            titulo="Situación de edad (referencia)"
            ayuda="Se cuentan los años cumplidos a la fecha de corte del calendario en el año lectivo y se comparan con la edad recomendada del grado. Ejemplo: con corte 31 de marzo, año lectivo 2027 y nacimiento el 15/06/2021, el aspirante tiene 5 años."
          />
        </h3>
        <EscalaSituacion cortes={vista} sinCalcular />
      </div>

      {borrador && (
        <div className="flex flex-col gap-2">
          <div className="flex items-end gap-3 pt-2">
            <div className="grid flex-1 grid-cols-[repeat(auto-fit,minmax(12rem,1fr))] gap-x-4 gap-y-6">
              {CORTES.map((c, i) => (
                <InputCorte
                  key={c.campo}
                  id={`cortes-defecto-${c.campo}`}
                  label={c.label}
                  autoFocus={i === 0}
                  invalido={Boolean(error)}
                  value={borrador[c.campo]}
                  onChange={(v) => {
                    setError(null)
                    setBorrador((p) => p && { ...p, [c.campo]: v })
                  }}
                />
              ))}
            </div>
            {/* × y √ como en la fila en edición de las tablas; miden 40 px, igual que los campos. */}
            <div className="shrink-0">
              <AccionesFila
                editando
                puedeEditar={puedeEditar}
                guardando={guardando}
                etiqueta="cortes por defecto"
                onModificar={() => {}}
                onCancelar={cancelar}
              />
            </div>
          </div>
          <ErrorCampo mensaje={error} />
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Preextraedad es una señal de contexto: no genera aviso. Sin calcular: falta la edad del grado o
        la fecha de corte del calendario del establecimiento.
      </p>
    </form>
  )
}
