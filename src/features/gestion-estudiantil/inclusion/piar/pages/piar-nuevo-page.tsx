import { useState } from "react"
import { useNavigate, useSearch } from "@tanstack/react-router"
import { useMutation, useQueryClient } from "@tanstack/react-query"

import { TableScreen, TableScreenBody, TableScreenHeader, TableScreenTitle } from "@/components/layout/table-screen"
import { NoticeBanner } from "@/components/notice/notice-banner"
import { NoticeProvider, queueNotice } from "@/components/notice/notice-context"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FloppyDiskIcon, SpinnerIcon } from "@/components/ui/icons"
import { paths } from "@/config/paths"
import { mensajePiar } from "@/features/gestion-estudiantil/inclusion/piar/utils/errores-piar"
import { evalCol } from "@/lib/eval-col-client"
import { useAppForm } from "@/lib/forms"

import { ComboOpciones } from "@/features/gestion-estudiantil/convivencia/components/combo-opciones"
import { TextoLargo } from "@/features/gestion-estudiantil/convivencia/components/texto-largo"
import { BASE, piarKeys } from "@/features/gestion-estudiantil/inclusion/piar/api/query-keys"
import { useMatriculasDisponiblesQuery } from "@/features/gestion-estudiantil/inclusion/piar/api/query/use-piar-query"
import { esOpcionElegida } from "@/features/gestion-estudiantil/inclusion/piar/utils/piar"
import { CamposDatosPiar } from "@/features/gestion-estudiantil/inclusion/piar/components/campos-datos-piar"
import { CAMPOS_VACIOS, datosAlBackend, esquemaDatos } from "@/features/gestion-estudiantil/inclusion/piar/utils/datos-piar"

/** G.4.PIA.NUE.1: tras el primer guardado se abre la ficha con cobertura, ajustes, actividades y acta (FIC.3). */
export function PiarNuevoPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { matricula: inicial } = useSearch({ strict: false }) as { matricula?: number }
  const [matricula, setMatricula] = useState(inicial ? String(inicial) : "")
  const [notice, setNotice] = useState<{ id: number; message: string } | null>(null)

  const [busqueda, setBusqueda] = useState("")
  const [justificacion, setJustificacion] = useState("")
  const { data } = useMatriculasDisponiblesQuery(busqueda)
  const candidatos = data ?? []
  const opciones = candidatos.map((c) => ({ value: String(c.fk_tmatricula), label: `${c.estudiante_nombre} · ${c.grado_grupo}` }))
  const elegido = candidatos.find((c) => String(c.fk_tmatricula) === matricula)

  const crear = useMutation({
    mutationFn: (body: unknown) => evalCol.postRow<{ id: number }>(`${BASE}/piar`, body),
    onSuccess: async ({ id }) => {
      await queryClient.invalidateQueries({ queryKey: piarKeys.all })
      queueNotice("PIAR creado en Borrador.")
      navigate({ to: paths.app.piarFicha.getHref(id) })
    },
    onError: (error) => setNotice({ id: Date.now(), message: mensajePiar(error) }),
  })

  const form = useAppForm({
    defaultValues: CAMPOS_VACIOS,
    validators: { onSubmit: esquemaDatos },
    onSubmit: ({ value }) => {
      if (!matricula) {
        setNotice({ id: Date.now(), message: "Elija el estudiante." })
        return
      }
      crear.mutate({ FK_MATRICULA: Number(matricula), JUSTIFICACION_CONDICION: justificacion.trim() || null, ...datosAlBackend(value) })
    },
  })

  return (
    <NoticeProvider>
    <TableScreen>
      <TableScreenHeader>
        <TableScreenTitle
          action={
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant="outline" color="muted" onClick={() => navigate({ to: paths.app.inclusionOrientacion.getHref() })}>
                Cancelar
              </Button>
              <Button size="sm" disabled={crear.isPending} onClick={() => form.handleSubmit()}>
                {crear.isPending ? <SpinnerIcon data-icon="inline-start" className="animate-spin" /> : <FloppyDiskIcon data-icon="inline-start" />}
                Guardar
              </Button>
            </div>
          }
        >
          <span className="flex items-center gap-2">
            Nuevo PIAR
            <Badge variant="soft" color="muted">Borrador</Badge>
          </span>
        </TableScreenTitle>
      </TableScreenHeader>
      <TableScreenBody contentClassName="flex flex-col gap-4">
        <NoticeBanner notice={notice} onClose={() => setNotice(null)} variant="error" />
        <div className="grid gap-4 sm:grid-cols-2">
          <ComboOpciones
            id="piar-estudiante"
            label="Estudiante"
            required
            todos={false}
            placeholder="Seleccione"
            value={matricula}
            options={opciones}
            onChange={setMatricula}
            onInputChange={(texto) => !esOpcionElegida(texto, opciones) && setBusqueda(texto)}
          />
          <form.AppField name="fecha">{(f) => <f.DateField label="Fecha de elaboración" required />}</form.AppField>
        </div>
        {elegido?.tiene_condicion && <p className="text-sm text-muted-foreground">Condición: {elegido.condicion} (de la matrícula, solo lectura)</p>}
        {elegido && !elegido.tiene_condicion && (
          <TextoLargo id="piar-justificacion" label="Justificación del PIAR sin condición registrada" required max={1000} value={justificacion} onChange={setJustificacion} />
        )}
        <div className="divide-y divide-border overflow-hidden rounded-lg border border-border">
          <CamposDatosPiar form={form} />
        </div>
        <p className="text-xs text-muted-foreground">Los campos marcados con * son obligatorios</p>
      </TableScreenBody>
    </TableScreen>
    </NoticeProvider>
  )
}
