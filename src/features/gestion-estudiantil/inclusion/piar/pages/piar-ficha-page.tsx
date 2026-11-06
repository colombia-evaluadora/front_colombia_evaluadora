import { Link, useParams } from "@tanstack/react-router"

import { TableScreen, TableScreenBody } from "@/components/layout/table-screen"
import { NoticeBanner } from "@/components/notice/notice-banner"
import { NoticeOutlet, NoticeProvider } from "@/components/notice/notice-context"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { paths } from "@/config/paths"

import { FormDisabledProvider } from "@/lib/forms"

import { formatFecha } from "@/features/gestion-estudiantil/observador/api/ui-mappings"
import { usePiarQuery } from "@/features/gestion-estudiantil/inclusion/piar/api/query/use-piar-query"
import type { PiarDetalle } from "@/features/gestion-estudiantil/inclusion/piar/api/types"
import { CamposDatosPiar } from "@/features/gestion-estudiantil/inclusion/piar/components/campos-datos-piar"
import { DialogosPiar } from "@/features/gestion-estudiantil/inclusion/piar/components/dialogos-piar"
import { EncabezadoFicha } from "@/features/gestion-estudiantil/inclusion/piar/components/ficha/encabezado-ficha"
import { SeccionActa } from "@/features/gestion-estudiantil/inclusion/piar/components/ficha/seccion-acta"
import {
  SeccionActividades,
  SeccionAjustes,
  SeccionAntecedentes,
  SeccionCobertura,
  SeccionDatosExistentes,
  SeccionInformes,
  SeccionRedes,
} from "@/features/gestion-estudiantil/inclusion/piar/components/ficha/secciones-expediente"
import { TarjetaAjuste } from "@/features/gestion-estudiantil/inclusion/piar/components/ficha/tarjeta-ajuste"
import { AvisoPiar, ListaDatos, Par, Vacio } from "@/features/gestion-estudiantil/inclusion/piar/components/ui-piar"
import { useFichaPiar, type FichaPiar } from "@/features/gestion-estudiantil/inclusion/piar/hooks/use-ficha-piar"
import { mensajePiar } from "@/features/gestion-estudiantil/inclusion/piar/utils/errores-piar"
import { esEditable, progresoBloques } from "@/features/gestion-estudiantil/inclusion/piar/utils/piar"

function AvisosFicha({ piar }: { piar: PiarDetalle }) {
  const porMapear = piar.ajustes.filter((a) => a.por_mapear).length
  const pendientes = (piar.cobertura ?? []).filter((c) => c.cobertura === "PENDIENTE_REVISION").length
  const progreso = piar.ve_sensible ? progresoBloques(piar) : null
  const borrador = piar.estado.codigo === "BORRADOR"
  return (
    <>
      {borrador && piar.fk_tpiar_origen != null && (
        <AvisoPiar>PIAR de un estudiante trasladado: {porMapear} ajustes sin asignatura (Por mapear) y {pendientes} asignaturas pendientes de revisión. No se puede activar hasta resolverlos.</AvisoPiar>
      )}
      {borrador && piar.fk_tpiar_origen == null && progreso && progreso.faltan.length > 0 && (
        <AvisoPiar tipo="info">{progreso.completos} de {progreso.total} bloques completos. Falta: {progreso.faltan.join(", ")}.</AvisoPiar>
      )}
      {piar.origen && (
        <AvisoPiar tipo="info">
          PIAR de origen:{" "}
          <Link className="text-primary hover:underline" to={paths.app.piarFicha.getHref(piar.origen.id)}>
            {piar.origen.establecimiento} · {piar.origen.periodo}
          </Link>{" "}
          (en consulta, solo lectura).
        </AvisoPiar>
      )}
      {piar.solo_consulta && <AvisoPiar tipo="info">Este PIAR es de otro establecimiento: solo se consulta (Regla 15).</AvisoPiar>}
      {piar.anulacion && <AvisoPiar tipo="error">PIAR anulado{piar.anulacion.motivo ? `: ${piar.anulacion.motivo}` : ""}.</AvisoPiar>}
    </>
  )
}

/** FIC.4: el docente solo recibe sus ajustes y su seguimiento (Regla 1). */
function VistaDocente({ ficha }: { ficha: FichaPiar }) {
  const { piar, access, estado, setDialogo } = ficha
  const asignaturas = [...new Set(piar.ajustes.map((a) => a.asignatura_nombre).filter(Boolean))].join(", ")
  return (
    <>
      <p className="text-sm">Usted ve los ajustes de sus asignaturas en este PIAR: {asignaturas || "ninguna"}.</p>
      <div className="grid gap-3">
        {piar.ajustes.map((a, i) => (
          <TarjetaAjuste key={a.id} ajuste={a} indice={i + 1} piarId={piar.id} editaAjuste={false} sensible={false} puedeEditar={access.puedeEditarAjustes && esEditable(estado)} onDialogo={setDialogo} />
        ))}
        {!piar.ajustes.length && <Vacio>No tiene ajustes en sus asignaturas.</Vacio>}
      </div>
    </>
  )
}

function Expediente({ ficha }: { ficha: FichaPiar }) {
  const { piar, estado, form } = ficha
  const concluida = estado === "REVISION_CONCLUIDA"
  return (
    <div className="divide-y divide-border overflow-hidden rounded-lg border border-border">
      {concluida && piar.conclusion && (
        <div className="p-4 text-sm">
          <ListaDatos>
            <Par label="Concluida por">{piar.conclusion.responsable ?? "—"} · {formatFecha(piar.conclusion.fecha_conclusion)}</Par>
            <Par label="Próxima revisión">{formatFecha(piar.conclusion.fecha_proxima_revision)}</Par>
            <Par label="Síntesis de orientación">{piar.conclusion.sintesis}</Par>
            <Par label="Recomendaciones">{piar.conclusion.recomendaciones}</Par>
          </ListaDatos>
        </div>
      )}
      <SeccionDatosExistentes ficha={ficha} />
      {/* Los datos solo se editan en Borrador (fn_piar_validar_datos). */}
      <FormDisabledProvider disabled={estado !== "BORRADOR" || !ficha.gestiona}>
        <CamposDatosPiar form={form} abiertas={false} />
      </FormDisabledProvider>
      <SeccionRedes ficha={ficha} />
      <SeccionInformes ficha={ficha} />
      <SeccionAntecedentes ficha={ficha} />
      <SeccionCobertura ficha={ficha} />
      {!concluida && <SeccionAjustes ficha={ficha} />}
      {!concluida && <SeccionActividades ficha={ficha} />}
      {!concluida && <SeccionActa ficha={ficha} />}
      {piar.cierre && (
        <div className="p-4 text-sm">
          <ListaDatos>
            <Par label="Cerrado el">{formatFecha(piar.cierre.cerrado_en)}</Par>
            <Par label="Informe">{piar.cierre.informe_anual}</Par>
          </ListaDatos>
        </div>
      )}
    </div>
  )
}

function FichaContenido({ piar }: { piar: PiarDetalle }) {
  const ficha = useFichaPiar(piar)
  const { notice, setNotice, version, dialogo, setDialogo } = ficha
  return (
    <>
      <EncabezadoFicha ficha={ficha} />
      <TableScreenBody contentClassName="flex flex-col gap-3">
        <NoticeOutlet />
        <NoticeBanner notice={notice} onClose={() => setNotice(null)} variant={notice?.variant ?? "error"} />
        <AvisosFicha piar={piar} />
        <p className="text-sm text-muted-foreground">
          {piar.condicion && <>Condición: <span className="text-foreground">{piar.condicion}</span> (de la matrícula) · </>}
          Elaboración: <span className="text-foreground">{formatFecha(piar.fecha_elaboracion)}</span>
          {piar.elabora?.nombre && <> · Elabora: <span className="text-foreground">{piar.elabora.nombre}</span></>}
          {piar.periodo_academico && <> · Período Académico: <span className="text-foreground">{piar.periodo_academico}</span></>}
          {version && <> · Versión: <span className="text-foreground">{version.numero}</span></>}
        </p>
        {piar.ve_sensible ? <Expediente ficha={ficha} /> : <VistaDocente ficha={ficha} />}
      </TableScreenBody>
      <DialogosPiar piar={piar} dialogo={dialogo} onClose={() => setDialogo(null)} />
    </>
  )
}

/** G.4.PIA.FIC.1-6: la misma ficha según estado y rol; el backend solo manda lo que el rol puede ver. */
export function PiarFichaPage() {
  const { piarId } = useParams({ strict: false }) as { piarId: string }
  const { data, isPending, error, refetch } = usePiarQuery(Number(piarId))
  return (
    <NoticeProvider>
    <TableScreen>
      {isPending ? (
        <div className="grid gap-3 p-6"><Skeleton className="h-10 w-1/2" /><Skeleton className="h-96 w-full" /></div>
      ) : error || !data ? (
        <div className="grid justify-items-start gap-3 p-6">
          <AvisoPiar tipo="error">{mensajePiar(error)}</AvisoPiar>
          <Button size="sm" variant="outline" color="neutral" onClick={() => refetch()}>Reintentar</Button>
        </div>
      ) : (
        <FichaContenido key={`${data.id}-${data.estado.codigo}`} piar={data} />
      )}
    </TableScreen>
    </NoticeProvider>
  )
}
