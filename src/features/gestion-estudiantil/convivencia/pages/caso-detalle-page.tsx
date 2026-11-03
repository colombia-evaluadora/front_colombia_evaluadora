import type { ReactNode } from "react"
import { useCanGoBack, useNavigate, useRouter } from "@tanstack/react-router"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeftIcon, ArrowsDownUpIcon, ClipboardAddIcon, InfoIcon } from "@/components/ui/icons"
import { Skeleton } from "@/components/ui/skeleton"
import { TableScreen, TableScreenBody, TableScreenHeader, TableScreenTitle } from "@/components/layout/table-screen"
import { ErrorNoticeBanner } from "@/components/notice/error-notice-banner"
import { NoticeOutlet, NoticeProvider } from "@/components/notice/notice-context"
import { paths } from "@/config/paths"

import { useCasoQuery, usePasosCasoQuery } from "@/features/gestion-estudiantil/convivencia/api/query/use-casos-query"
import { nombreDe, useCatalogo } from "@/features/gestion-estudiantil/convivencia/api/use-catalogos-convivencia"
import { useConvivenciaAccess } from "@/features/gestion-estudiantil/convivencia/api/use-convivencia-access"
import {
  COLOR_ESTADO,
  esFinal,
  fechaHechosTexto,
  formatFecha,
  formatFechaHora,
} from "@/features/gestion-estudiantil/convivencia/api/ui-mappings"
import { resumenDeDetalle, type CasoDetalle, type PasoCaso } from "@/features/gestion-estudiantil/convivencia/api/types"
import { MenuAccionesCaso } from "@/features/gestion-estudiantil/convivencia/components/menu-acciones-caso"
import { useDialogosCaso } from "@/features/gestion-estudiantil/convivencia/components/dialogs/use-dialogos-caso"

function Dato({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm">{children || "—"}</dd>
    </div>
  )
}

function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-base font-medium">{titulo}</h2>
      {children}
    </section>
  )
}

function EstadoPaso({ paso }: { paso: PasoCaso }) {
  if (paso.no_aplica)
    return (
      <Badge variant="soft" color="muted">
        No aplica
      </Badge>
    )
  return paso.registrado ? (
    <Badge variant="soft" color="success">
      Registrado
    </Badge>
  ) : (
    <Badge variant="soft" color="warning">
      Pendiente
    </Badge>
  )
}

function DatosCompletos({ caso }: { caso: CasoDetalle }) {
  const manifestaciones = useCatalogo("MANIFESTACION_SITUACION")
  const lugares = useCatalogo("LUGAR_SITUACION")
  const danos = useCatalogo("TIPO_DANO")
  const agresiones = useCatalogo("TIPO_AGRESION")
  const eventos = useCatalogo("EVENTO_GENERADOR")
  const entidades = useCatalogo("ENTIDAD_CONCERNIDA_CONVIVENCIA")
  const pasos = usePasosCasoQuery(caso.id)
  const { fecha, hora } = fechaHechosTexto(caso)
  const siNo = (b: boolean | null | undefined) => (b == null ? "" : b ? "Sí" : "No")
  const nombreAfectado = (c: { fk_matricula: number | null; fk_funcionario: number | null }) =>
    c.fk_matricula
      ? caso.estudiantes?.find((e) => e.fk_matricula === c.fk_matricula)?.nombre
      : caso.otros_involucrados?.find((i) => i.fk_funcionario === c.fk_funcionario)?.nombre

  return (
    <>
      <Seccion titulo="Datos del caso">
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <Dato label="Fecha de los hechos">{hora ? `${fecha} · ${hora}` : fecha}</Dato>
          <Dato label="Fecha de conocimiento">{formatFecha(caso.fecha_conocimiento)}</Dato>
          <Dato label="Manifestación">{nombreDe(manifestaciones, caso.fk_tlv_manifestacion)}</Dato>
          <Dato label="Lugar">{nombreDe(lugares, caso.fk_tlv_lugar)}</Dato>
          <Dato label="Reportado por">{caso.reporta_nombre}</Dato>
          <Dato label="Gestor">
            {caso.fk_funcionario_gestor ? (
              caso.gestor_nombre
            ) : (
              <Badge variant="soft" color="warning">
                Sin gestor
              </Badge>
            )}
          </Dato>
          <Dato label="Último seguimiento">{caso.ultimo_seguimiento}</Dato>
          <Dato label="Anotaciones de origen">{caso.anotaciones_origen?.length ? `${caso.anotaciones_origen.length}` : ""}</Dato>
        </dl>
        <Dato label="Descripción de los hechos">
          <span className="whitespace-pre-wrap">{caso.descripcion}</span>
        </Dato>
      </Seccion>

      <Seccion titulo="Datos para el SIUCE">
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <Dato label="Tipo de daño">{(caso.tipos_dano ?? []).map((d) => nombreDe(danos, d)).filter(Boolean).join(", ")}</Dato>
          <Dato label="Tipo de agresión">{nombreDe(agresiones, caso.fk_tlv_tipo_agresion)}</Dato>
          <Dato label="Evento generador">{nombreDe(eventos, caso.fk_tlv_evento_generador)}</Dato>
          <Dato label="Situación repetitiva">{siNo(caso.situacion_repetitiva)}</Dato>
          <Dato label="Secuelas físicas">{siNo(caso.secuelas_fisicas)}</Dato>
          <Dato label="Soporte">{caso.fk_tarchivo_soporte ? "Adjunto" : ""}</Dato>
        </dl>
      </Seccion>

      <Seccion titulo={`Estudiantes involucrados (${caso.estudiantes?.length ?? 0})`}>
        <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
          {(caso.estudiantes ?? []).map((e) => (
            <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm">
              <span>
                <span className="font-medium">{e.nombre}</span>
                {e.grado_grupo && <span className="text-muted-foreground"> · {e.grado_grupo}</span>}
              </span>
              <span>{e.rol_nombre}</span>
            </li>
          ))}
        </ul>
      </Seccion>

      {caso.otros_involucrados && caso.otros_involucrados.length > 0 && (
        <Seccion titulo={`Otros involucrados (${caso.otros_involucrados.length})`}>
          <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
            {caso.otros_involucrados.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm">
                <span>
                  <span className="font-medium">{i.nombre}</span>
                  <span className="text-muted-foreground">
                    {" "}
                    · {i.tipo_nombre}
                    {i.numero_documento && ` · ${i.numero_documento}`}
                  </span>
                </span>
                <span>{i.rol_nombre}</span>
              </li>
            ))}
          </ul>
        </Seccion>
      )}

      <Seccion titulo="Pasos obligatorios del protocolo">
        {pasos.isPending ? (
          <Skeleton className="h-24" />
        ) : (
          <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
            {(pasos.data ?? []).map((p) => (
              <li key={p.accion} className="flex items-center justify-between gap-2 px-4 py-2.5 text-sm">
                <span>
                  {p.accion_nombre}
                  {p.condicional && <span className="text-xs text-muted-foreground"> · condicional</span>}
                  {p.de_cierre && <span className="text-xs text-muted-foreground"> · de cierre</span>}
                </span>
                <EstadoPaso paso={p} />
              </li>
            ))}
          </ul>
        )}
      </Seccion>

      <Seccion titulo={`Historial de acciones (${caso.acciones?.length ?? 0})`}>
        {caso.acciones?.length ? (
          <ol className="flex flex-col gap-3">
            {caso.acciones.map((a) => (
              <li key={a.id} className="flex flex-col gap-1 rounded-lg border border-border px-4 py-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{a.accion_nombre}</span>
                  {a.no_aplica && (
                    <Badge variant="soft" color="muted">
                      No aplica
                    </Badge>
                  )}
                  {a.resultado_nombre && (
                    <Badge variant="soft" color="info">
                      {a.resultado_nombre}
                    </Badge>
                  )}
                  <span className="ml-auto text-xs text-muted-foreground">
                    {formatFechaHora(a.fecha_hora)} · {a.responsable_nombre}
                  </span>
                </div>
                <p className="whitespace-pre-wrap text-muted-foreground">{a.descripcion}</p>
                {(a.fk_tlv_entidad || a.soportes.length > 0 || a.codigos_siuce.length > 0) && (
                  <p className="text-xs text-muted-foreground">
                    {a.fk_tlv_entidad && `Entidad: ${nombreDe(entidades, a.fk_tlv_entidad) ?? ""}. `}
                    {a.soportes.length > 0 && `${a.soportes.length} soporte(s). `}
                    {a.codigos_siuce.length > 0 &&
                      `SIUCE: ${a.codigos_siuce.map((c) => `${nombreAfectado(c) ?? "afectado"} ${c.codigo}`).join(", ")}.`}
                  </p>
                )}
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-muted-foreground">Aún no hay acciones registradas.</p>
        )}
      </Seccion>
    </>
  )
}

function CasoDetalleContent({ caso }: { caso: CasoDetalle }) {
  const navigate = useNavigate()
  const router = useRouter()
  const canGoBack = useCanGoBack()
  const access = useConvivenciaAccess()
  const { abrir, dialogos } = useDialogosCaso()
  const resumen = resumenDeDetalle(caso)
  const abierto = !esFinal(caso.estado_codigo)

  // Vuelve a donde vino (listado con sus filtros y página); con enlace directo, al listado.
  const volver = () =>
    canGoBack ? router.history.back() : navigate({ to: paths.app.convivencia.getHref() })

  return (
    <>
      <TableScreenHeader>
        <TableScreenTitle
          description={
            <Button variant="ghost" color="neutral" size="sm" className="-ml-3 h-auto font-normal text-sm" onClick={volver}>
              <ArrowLeftIcon data-icon="inline-start" />
              Volver a Convivencia
            </Button>
          }
          action={
            caso.acceso_completo && (
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" disabled={!(abierto && access.puedeSupervisar)} onClick={() => abrir("tipo", resumen)}>
                  <ArrowsDownUpIcon data-icon="inline-start" />
                  Cambiar tipo
                </Button>
                <Button size="sm" disabled={!(abierto && access.puedeGestionar)} onClick={() => abrir("accion", resumen)}>
                  <ClipboardAddIcon data-icon="inline-start" />
                  Registrar acción
                </Button>
                <MenuAccionesCaso
                  conVer={false}
                  caso={{ numero: caso.numero, estado_codigo: caso.estado_codigo, sinGestor: !caso.fk_funcionario_gestor }}
                  access={access}
                  onAccion={(accion) =>
                    accion === "modificar"
                      ? navigate({ to: paths.app.convivenciaEditar.getHref(caso.id) })
                      : accion !== "ver" && abrir(accion, resumen)
                  }
                />
              </div>
            )
          }
        >
          <span className="flex flex-wrap items-center gap-2">
            Caso {caso.numero}
            <Badge variant="soft" color="info">
              {caso.tipo_nombre}
            </Badge>
            <Badge variant="soft" color={COLOR_ESTADO[caso.estado_codigo] ?? "muted"}>
              {caso.estado_nombre}
            </Badge>
          </span>
        </TableScreenTitle>
        <NoticeOutlet className="mx-(--screen-spacing) my-4" />
      </TableScreenHeader>

      <TableScreenBody>
        <div className="flex max-w-5xl flex-col gap-6 pb-6">
          {caso.anulacion && (
            <Alert variant="warning">
              <InfoIcon aria-hidden="true" />
              <AlertDescription>
                Anulado el {formatFechaHora(caso.anulacion.anulado_en)}
                {caso.anulacion.anulado_por && ` por ${caso.anulacion.anulado_por}`}. Motivo: {caso.anulacion.motivo}
              </AlertDescription>
            </Alert>
          )}
          {caso.cierre && (
            <Alert>
              <InfoIcon aria-hidden="true" />
              <AlertDescription>
                Cerrado el {formatFechaHora(caso.cierre.cerrado_en)}
                {caso.cierre.cerrado_por && ` por ${caso.cierre.cerrado_por}`}. Resumen: {caso.cierre.resumen}
              </AlertDescription>
            </Alert>
          )}
          {caso.acceso_completo ? (
            <DatosCompletos caso={caso} />
          ) : (
            <>
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                <Dato label="Número">{String(caso.numero)}</Dato>
                <Dato label="Tipo">{caso.tipo_nombre}</Dato>
                <Dato label="Estado">{caso.estado_nombre}</Dato>
                <Dato label="Fecha de conocimiento">{formatFecha(caso.fecha_conocimiento)}</Dato>
              </dl>
              <Alert>
                <InfoIcon aria-hidden="true" />
                <AlertDescription>
                  Los datos de un caso {caso.tipo_nombre} son sensibles: como quien lo reportó, solo ve su estado.
                </AlertDescription>
              </Alert>
            </>
          )}
        </div>
      </TableScreenBody>
      {dialogos}
    </>
  )
}

/** Detalle del caso (3.1 y 3.2). El id llega por props desde router.tsx. */
export function CasoDetallePage({ casoId }: { casoId: number }) {
  const { data, isPending, isError, error } = useCasoQuery(casoId)
  return (
    <NoticeProvider>
      <TableScreen>
        {isPending ? (
          <Skeleton className="m-6 h-96" />
        ) : isError || !data ? (
          <ErrorNoticeBanner error={error ?? true} fallback="No se encontró el caso." className="m-6" />
        ) : (
          <CasoDetalleContent caso={data} />
        )}
      </TableScreen>
    </NoticeProvider>
  )
}
