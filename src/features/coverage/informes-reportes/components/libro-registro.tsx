import { useState, type ReactNode } from "react"

import { TableScreen, TableScreenBody, TableScreenHeader } from "@/components/layout/table-screen"
import { MarcoOpciones } from "@/components/marco-opciones"
import { useNotify } from "@/components/notice/notice-context"
import { Button } from "@/components/ui/button"
import { FilePdfIcon, SpinnerIcon } from "@/components/ui/icons"
import { Switch } from "@/components/ui/switch"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { getErrorMessage } from "@/lib/api-client"
import { coberturaInformesReportesRoute } from "@/router"

import { ComboOpciones } from "@/features/gestion-estudiantil/commons/components/combo-opciones"
import {
  MODOS_LIBRO,
  useGenerarLibro,
  usePreviaLibroQuery,
  type ModoLibro,
} from "@/features/coverage/informes-reportes/api/libro-registro"

/**
 * Generar por, Generar como borrador y Generar libro (C.4.LIB.1): van en la fila de filtros, después
 * de Sede, Jornada, Período (solo Cerrados) y Grado. El libro es del grado completo.
 */
export function ControlesLibro() {
  const search = coberturaInformesReportesRoute.useSearch()
  const navigate = coberturaInformesReportesRoute.useNavigate()
  const { notify } = useNotify()
  const modo: ModoLibro = search.libroModo ?? "GRUPO"
  const [borrador, setBorrador] = useState(true)
  const listo = Boolean(search.periodo) && search.grado != null
  const previa = usePreviaLibroQuery(search.periodo, search.grado, modo)
  const generar = useGenerarLibro()

  const unidad = modo === "ESTUDIANTE" ? "estudiante" : "grupo"
  const ayuda = !listo
    ? "Elija el período y el grado primero"
    : borrador
      ? "Borrador: sin libro, folio ni código QR; no gasta numeración."
      : previa.data
        ? `Se asignará el Libro ${previa.data.libro}, folios 001 a ${String(previa.data.folios).padStart(3, "0")} (uno por ${unidad}), con su código QR.`
        : "Se asignarán el libro y los folios, con su código QR."

  return (
    <>
      <ComboOpciones
        id="inf-f-libro-modo"
        label="Generar por"
        size="sm"
        value={modo}
        options={MODOS_LIBRO}
        onChange={(v) => navigate({ search: (prev) => ({ ...prev, libroModo: (v || undefined) as ModoLibro | undefined }), replace: true })}
      />
      <div className="flex items-end gap-3">
        <MarcoOpciones id="inf-libro-borrador" label="Generar como borrador" className="flex-1">
          <div className="flex items-center gap-2">
            <Switch id="inf-libro-borrador-switch" checked={borrador} onCheckedChange={setBorrador} />
            <span className="text-sm">{borrador ? "Sí" : "No"}</span>
          </div>
        </MarcoOpciones>
        <Tooltip>
          <TooltipTrigger
            render={
              <span>
                <Button
                  type="button"
                  variant="fill"
                  color="primary"
                  size="sm"
                  disabled={!listo || generar.isPending}
                  onClick={() =>
                    generar.mutate(
                      { periodo: search.periodo as number, grado: search.grado as number, modo, borrador },
                      {
                        onSuccess: () => notify(borrador ? "Se generó el borrador del libro de registro." : "Se emitió el libro de registro."),
                        onError: (err) => notify(getErrorMessage(err), { variant: "error" }),
                      },
                    )
                  }
                >
                  {generar.isPending ? <SpinnerIcon data-icon="inline-start" className="animate-spin" /> : <FilePdfIcon data-icon="inline-start" />}
                  Generar libro
                </Button>
              </span>
            }
          />
          <TooltipContent>{ayuda}</TooltipContent>
        </Tooltip>
      </div>
    </>
  )
}

/** Cuerpo del Libro de registro: no hay tabla, el documento sale en PDF. */
export function LibroRegistroInforme({ encabezado }: { encabezado: ReactNode }) {
  const search = coberturaInformesReportesRoute.useSearch()
  return (
    <TableScreen>
      <TableScreenHeader>{encabezado}</TableScreenHeader>
      <TableScreenBody>
        <p className="p-10 text-center text-sm text-muted-foreground">
          {search.grado != null ? "Genere el libro: sale en PDF." : "Elija el grado y genere el libro."}
        </p>
      </TableScreenBody>
    </TableScreen>
  )
}
