import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import { getErrorMessage } from "@/lib/api-client"

import type { useAgregarBeneficiariosForm } from "@/features/gestion-estudiantil/prevencion/hooks/use-agregar-beneficiarios-form"

type Form = ReturnType<typeof useAgregarBeneficiariosForm>

/** Casillas de los matriculados (G.8.EST.8): «Seleccionar todos» abarca todas las páginas; «Ya es beneficiario» va deshabilitado. */
export function ListaMatriculados({ f }: { f: Form }) {
  if (f.cargando) return <Skeleton className="h-40" />
  if (f.errorLista) return <p className="text-sm text-destructive">{getErrorMessage(f.errorLista)}</p>
  if (f.filas.length === 0)
    return <p className="py-6 text-center text-sm text-muted-foreground">No hay estudiantes matriculados para esos filtros.</p>

  const parcial = f.seleccionados > 0 && !f.todosMarcado
  return (
    <div className="flex flex-col">
      <label className="flex items-center gap-3 border-b py-2 text-sm">
        <Checkbox
          checked={f.todosMarcado}
          indeterminate={parcial}
          disabled={f.cargandoTodos}
          onCheckedChange={() => void f.alternarTodos()}
        />
        {f.cargandoTodos ? "Seleccionando…" : "Seleccionar todos"}
      </label>
      <ul className="max-h-64 overflow-y-auto" aria-label="Estudiantes matriculados">
        {f.filas.map((m) => {
          const marcado = m.ya_es_beneficiario || f.seleccion.has(m.fk_tmatricula)
          return (
            <li key={m.fk_tmatricula} className="border-b last:border-b-0">
              <label className="flex items-center gap-3 py-2 text-sm">
                <Checkbox
                  checked={marcado}
                  disabled={m.ya_es_beneficiario}
                  onCheckedChange={() => f.alternar(m)}
                />
                <span className={m.ya_es_beneficiario ? "text-muted-foreground" : "font-medium"}>{m.estudiante_nombre}</span>
                <span className="text-muted-foreground">· {m.grado_grupo}</span>
                {m.ya_es_beneficiario && <span className="ml-auto text-xs text-muted-foreground">Ya es beneficiario</span>}
              </label>
            </li>
          )
        })}
      </ul>
      {f.paginas > 1 && (
        <div className="flex items-center justify-end gap-2 pt-2 text-xs text-muted-foreground">
          <Button
            size="sm"
            type="button"
            variant="ghost"
            color="neutral"
            disabled={f.pageIndex === 0}
            onClick={() => f.setPageIndex(f.pageIndex - 1)}
          >
            Anterior
          </Button>
          <span>
            Página {f.pageIndex + 1} de {f.paginas}
          </span>
          <Button
            size="sm"
            type="button"
            variant="ghost"
            color="neutral"
            disabled={f.pageIndex >= f.paginas - 1}
            onClick={() => f.setPageIndex(f.pageIndex + 1)}
          >
            Siguiente
          </Button>
        </div>
      )}
    </div>
  )
}
