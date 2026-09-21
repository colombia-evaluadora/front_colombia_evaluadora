import { useState } from "react"
import { Link, useNavigate, useParams } from "@tanstack/react-router"

import { Button } from "@/components/ui/button"
import { NoticeOutlet, NoticeProvider, queueNotice, useNotify } from "@/components/notice/notice-context"
import {
  TableScreen,
  TableScreenBody,
  TableScreenFooter,
  TableScreenHeader,
  TableScreenTitle,
} from "@/components/layout/table-screen"
import { NotFoundPage } from "@/components/layout/not-found-page"
import { CheckIcon, SpinnerIcon } from "@/components/ui/icons"
import { Spinner } from "@/components/ui/spinner"
import { paths } from "@/config/paths"
import { getErrorMessage, isNotFoundError } from "@/lib/api-client"

import { useActividadDetalleQuery } from "@/features/planeador/api/query/use-actividad-detalle-query"
import { useInstrumentoActividadFormQuery } from "@/features/planeador/api/query/use-instrumento-actividad-form-query"
import { useUnidadesQuery } from "@/features/planeador/api/query/use-unidades-query"
import { useUpdateActividad } from "@/features/planeador/api/mutations/update-actividad"
import { useLinkActividadUnidad } from "@/features/planeador/api/mutations/link-actividad-unidad"
import { useUnlinkActividadUnidad } from "@/features/planeador/api/mutations/unlink-actividad-unidad"
import { useAgregarEvidenciaActividad } from "@/features/planeador/api/mutations/agregar-evidencia-actividad"
import { useUpdateMaterialesActividad } from "@/features/planeador/api/mutations/update-materiales-actividad"
import { useSetEstudiantesActividad } from "@/features/planeador/api/mutations/set-estudiantes-actividad"
import {
  tieneDefinicionInstrumento,
  useUpdateInstrumentoActividad,
} from "@/features/planeador/api/mutations/update-instrumento-actividad"
import { useUpdateAdaptacionesActividad } from "@/features/planeador/api/mutations/update-adaptaciones-actividad"
import { useAgregarCriterioUnidadActividad } from "@/features/planeador/api/mutations/agregar-criterio-unidad-actividad"
import { EditarActividadForm } from "@/features/planeador/components/forms/form-editar-actividad"
import type { Actividad } from "@/features/planeador/api/types/actividad"

const FORM_ID = "editar-actividad-form"

/**
 * Edición de una actividad en una ruta aparte (no in-place en el panel).
 *
 * Mismo `<TableScreen>` que el resto de las pantallas de gestión, con un
 * `<TableScreenFooter>` sticky al pie: el aviso + el botón "Guardar" solo
 * aparecen cuando hay cambios sin guardar (mismo patrón que el editar de
 * Establecimiento Educativo).
 *
 * El form carga la actividad vía `useActividadDetalleQuery` y guarda con
 * `useUpdateActividad` (`PUT /planeador/actividades/:id`, parcial).
 */
export function PlaneadorEditarActividadPage() {
  const navigate = useNavigate()
  const { actividadId } = useParams({ strict: false }) as { actividadId?: string }

  const {
    data: actividad,
    isPending,
    isError,
    error,
  } = useActividadDetalleQuery(actividadId ? Number(actividadId) : undefined)

  if (!actividadId) {
    return (
      <TableScreen>
        <TableScreenHeader>
          <TableScreenTitle>Planeador</TableScreenTitle>
        </TableScreenHeader>
        <TableScreenBody>
          <p className="text-muted-foreground px-6 py-12 text-center text-sm">
            Falta el identificador de la actividad.
          </p>
        </TableScreenBody>
      </TableScreen>
    )
  }

  if (isNotFoundError(error)) {
    return <NotFoundPage />
  }

  return (
    <NoticeProvider>
      <EditarActividadPageContent
        isPending={isPending}
        isError={isError}
        actividad={actividad}
        onClose={() => navigate({ to: paths.app.planeadorActividades.getHref() })}
      />
    </NoticeProvider>
  )
}

function EditarActividadPageContent({
  isPending,
  isError,
  actividad,
  onClose,
}: {
  isPending: boolean
  isError: boolean
  actividad: ReturnType<typeof useActividadDetalleQuery>["data"]
  onClose: () => void
}) {
  const [isDirty, setIsDirty] = useState(false)
  const { notify } = useNotify()

  // Para resolver si la unidad NUEVA (si el docente la cambió en el
  // select) calcula por "Ponderado" — ver el comentario de `handleSubmit`.
  const { data: unidadesResult } = useUnidadesQuery()
  const unidades = unidadesResult?.rows ?? []

  // Precarga la rúbrica/lista de cotejo/escala/personalizado YA GUARDADA
  // (el detalle real no la trae, ver `use-instrumento-actividad-form-query.ts`)
  // ANTES de montar `EditarActividadForm`: el form solo lee `defaultValues`
  // una vez al montar (`useForm`), así que aplicarla después con
  // `setFieldValue` marcaría el form "sucio" apenas termina de cargar, sin
  // que el docente haya tocado nada.
  const esEvaluativa = actividad?.esEvaluativa ?? false
  const { data: instrumentoForm, isPending: isPendingInstrumento } = useInstrumentoActividadFormQuery(
    actividad?.id,
    esEvaluativa,
  )
  const isPendingCompleto = isPending || (esEvaluativa && isPendingInstrumento)
  const actividadParaForm =
    actividad && (!esEvaluativa || instrumentoForm) ? { ...actividad, ...(instrumentoForm ?? {}) } : undefined

  // El "éxito"/navegación ya NO vive en `onSuccess` de esta mutación en
  // particular — ver el comentario grande en `handleSubmit`, que explica
  // por qué: antes navegaba apenas ESTA PUT terminaba, sin esperar a que
  // las demás (instrumento, materiales, adaptaciones, estudiantes) hubieran
  // siquiera terminado de mandarse, así que un error ahí quedaba mudo (la
  // pantalla ya se había ido) y el docente veía "actividad actualizada"
  // aunque la definición del instrumento no se hubiera guardado.
  const updateMutation = useUpdateActividad()

  // `update-actividad.ts` (`PUT /actividades/:id`) nunca manda `FK_TUNIDAD`:
  // reasignar la unidad de una actividad ya vinculada se delega acá, en las
  // rutas dedicadas de la carpeta 2 (`PUT .../unidades/:id/actividades/:act`
  // para vincular/mover, `PATCH .../unidades/actividades/:act` para
  // desvincular) — antes el `<Select>` de "Unidad temática asociada" del
  // form dejaba elegir otra unidad sin que el guardado hiciera nada con
  // eso, y encima el PUT seguía mandando `PONDERACION` calculado contra la
  // unidad NUEVA (todavía no aplicada) mientras el backend seguía
  // validándola contra la unidad VIEJA (la única que de verdad seguía
  // vinculada) — de ahí el 400 al cambiar de unidad en una actividad que
  // ya tenía una.
  const linkActividad = useLinkActividadUnidad()
  const unlinkActividad = useUnlinkActividadUnidad({ unidadId: actividad?.unidad.id ?? 0 })
  // Solo AGREGA evidencias nuevas (ver el comentario de `Actividad.
  // evidenciasIds`): no hay endpoint confirmado para desvincular una ya
  // relacionada, así que el checklist del form las deja tildadas y
  // deshabilitadas — nunca aparecen en el diff de `handleSubmit`.
  const agregarEvidencia = useAgregarEvidenciaActividad()
  // Reemplazo completo (`PUT .../materiales`) — se llama solo cuando la
  // lista de recursos cambió (ver `handleSubmit`), no en cada guardado.
  const updateMateriales = useUpdateMaterialesActividad({
    mutationConfig: {
      // Éxito PARCIAL, no un error — `recursosOmitidos` no aborta el resto
      // de `handleSubmit`, así que se avisa acá mismo en vez de por la
      // excepción del try/catch grande.
      onSuccess: ({ recursosOmitidos }) => {
        if (recursosOmitidos.length > 0) {
          notify(
            `No se guardaron estos materiales de tipo "Archivo" (sin un archivo cargado): ${recursosOmitidos.join(", ")}.`,
            { variant: "error" },
          )
        }
      },
    },
  })
  // Igual que `updateMateriales`: se llama solo cuando HAY algo que definir
  // (ver `tieneDefinicionInstrumento` — el detalle real no precarga la
  // rúbrica/lista de cotejo/escala ya guardada, así que "vacío" acá
  // significa "el docente no tocó esta sección", no "la borró a propósito").
  const updateInstrumento = useUpdateInstrumentoActividad()
  // Reemplazo completo (`PUT .../adaptaciones`) — mismo criterio que
  // `updateMateriales`: solo se llama si la lista cambió.
  const updateAdaptaciones = useUpdateAdaptacionesActividad()
  // `PUT .../estudiantes` — endpoint suelto de "Estudiantes", igual que
  // materiales/adaptaciones (ver `set-estudiantes-actividad.ts`). Se llama
  // solo si la selección de verdad cambió frente a lo que ya traía el
  // detalle (`matriculasIds` arranca con la selección REAL, V452 — ver
  // `use-actividad-detalle-query.ts`), mismo criterio de "solo si cambió"
  // que `updateMateriales`/`updateAdaptaciones` más abajo.
  const setEstudiantes = useSetEstudiantesActividad()
  // Solo AGREGA criterios nuevos — mismo criterio que `agregarEvidencia`
  // (ver el comentario de `Actividad.criteriosUnidadIds`).
  const agregarCriterio = useAgregarCriterioUnidadActividad()
  const isSavingUnidad = linkActividad.isPending || unlinkActividad.isPending

  async function handleSubmit(values: Actividad) {
    if (!actividad) return
    const unidadAnteriorId = actividad.unidad.id
    const unidadNuevaId = values.unidad.id

    if (unidadNuevaId !== unidadAnteriorId) {
      try {
        if (unidadNuevaId === 0) {
          await unlinkActividad.mutateAsync(actividad.id)
        } else {
          const unidadNueva = unidades.find((u) => u.id === unidadNuevaId)
          const esPonderado = unidadNueva?.metodoCalculo === "Ponderado"
          await linkActividad.mutateAsync({
            unidadId: unidadNuevaId,
            actividadId: actividad.id,
            // Mismo criterio que `DialogAgregarActividad.handleVincular`:
            // solo se manda la ponderación tipeada si la unidad NUEVA
            // calcula por "Ponderado" — con Promedio simple/Suma de puntos
            // el backend rechaza que se mande `PONDERACION` (ni siquiera en
            // `0`), por eso `omitirPonderacion` la saca del body entero.
            ponderacion: esPonderado ? values.ponderacion : 0,
            omitirPonderacion: !esPonderado,
            // Obligatorio en `true` cuando la actividad YA estaba en OTRA
            // unidad (no una huérfana que recién se vincula).
            permitirMoverDeUnidad: unidadAnteriorId !== 0,
          })
        }
      } catch (error) {
        notify(getErrorMessage(error), { variant: "error" })
        return
      }
    }

    // De acá para abajo, TODO se encadena con `await` dentro de un único
    // try/catch — antes cada mutación se disparaba con `.mutate()` (sin
    // esperar) e `onSuccess`/`onClose` de `updateMutation` navegaba de
    // vuelta al Planeador apenas ESA PUT terminaba, sin importar si las
    // demás (instrumento, materiales, adaptaciones, estudiantes) habían
    // siquiera empezado. Eso rompía de dos formas confirmadas en producción:
    //
    // 1. `PUT .../instrumento` exige que `TACTIVIDAD.FK_TLV_INSTRUMENTO_
    //    EVALUACION` YA esté fijado al instrumento que se está definiendo
    //    (ver `update-instrumento-actividad.ts`) — y quien fija ese campo
    //    es justamente `updateMutation`, EN LA MISMA PUT que antes no se
    //    esperaba. Cambiar de instrumento al editar (ej. a "Escala de
    //    valoración") disparaba las dos PUT casi a la vez y la de
    //    instrumento le ganaba la carrera a la del campo que necesitaba:
    //    el backend la rechazaba con el error del instrumento VIEJO
    //    ("p_items debe ser...", "p_criterios debe ser..." — los nombres
    //    de parámetro de rúbrica/lista de cotejo, no de escala).
    // 2. El error de CUALQUIERA de las otras mutaciones (`notify()`, no
    //    `queueNotice()`) se perdía: `onClose()` ya había desmontado esta
    //    pantalla (y su `NoticeProvider`) para cuando esa mutación
    //    resolvía, así que el docente veía "Actividad actualizada
    //    correctamente" y volvía al Planeador aunque, por ejemplo, el
    //    instrumento hubiera fallado con "valorMin debe ser menor que
    //    valorMax" y NUNCA se hubiera guardado.
    //
    // Ahora nada de esto navega ni avisa éxito hasta que TODO lo que tenía
    // algo que guardar terminó bien; el primer error frena el resto y se
    // avisa con la pantalla todavía montada.
    try {
      await updateMutation.mutateAsync({ actividadId: actividad.id, data: values })

      // Evidencias marcadas en este submit que todavía no estaban
      // relacionadas — cada una es su propio `POST`, no hay bulk confirmado.
      const evidenciasNuevas = values.evidenciasIds.filter(
        (id) => !actividad.evidenciasIds.includes(id),
      )
      for (const evidenciaId of evidenciasNuevas) {
        await agregarEvidencia.mutateAsync({ actividadId: actividad.id, evidenciaId })
      }

      // `PUT .../materiales` reemplaza TODA la lista — solo se llama si de
      // verdad cambió, para no pegarle al backend en cada guardado cuando el
      // docente tocó otro campo (ej. fechas) y dejó los recursos intactos.
      if (JSON.stringify(values.recursos) !== JSON.stringify(actividad.recursos)) {
        await updateMateriales.mutateAsync({ actividadId: actividad.id, recursos: values.recursos })
      }

      if (values.esEvaluativa && tieneDefinicionInstrumento(values)) {
        await updateInstrumento.mutateAsync({ actividadId: actividad.id, actividad: values })
      }

      // `PUT .../adaptaciones` reemplaza TODA la lista — mismo criterio de
      // "solo si cambió" que `updateMateriales`.
      if (JSON.stringify(values.adaptaciones) !== JSON.stringify(actividad.adaptaciones)) {
        await updateAdaptaciones.mutateAsync({ actividadId: actividad.id, adaptaciones: values.adaptaciones })
      }

      // Criterios de la unidad marcados en este submit que todavía no estaban
      // relacionados — mismo criterio que las evidencias nuevas de arriba.
      const criteriosNuevos = values.criteriosUnidadIds.filter(
        (id) => !actividad.criteriosUnidadIds.includes(id),
      )
      for (const criterioUnidadId of criteriosNuevos) {
        await agregarCriterio.mutateAsync({ actividadId: actividad.id, criterioUnidadId })
      }

      // "Estudiantes": solo si de verdad cambió (ver el comentario de
      // `setEstudiantes` arriba) — cubre tanto puntualizar a un subconjunto
      // como volver a "Todo el grupo" (`asignarTodoElGrupo` pasa de `false` a
      // `true`, que antes nunca se mandaba porque `matriculasIds` quedaba
      // vacío en ese caso).
      const estudiantesCambiaron =
        values.asignarTodoElGrupo !== actividad.asignarTodoElGrupo ||
        (!values.asignarTodoElGrupo &&
          JSON.stringify([...values.matriculasIds].sort((a, b) => a - b)) !==
            JSON.stringify([...actividad.matriculasIds].sort((a, b) => a - b)))
      if (estudiantesCambiaron) {
        await setEstudiantes.mutateAsync({
          actividadId: actividad.id,
          matriculasIds: values.matriculasIds,
          asignarTodoElGrupo: values.asignarTodoElGrupo,
        })
      }

      // `queueNotice`, no `notify`: recién ahora se navega, así que el
      // aviso lo tiene que mostrar el `NoticeProvider` del Planeador, no el
      // de esta pantalla (que está a punto de desmontarse).
      queueNotice("Actividad actualizada correctamente.")
      setIsDirty(false)
      onClose()
    } catch (error) {
      notify(getErrorMessage(error), { variant: "error" })
    }
  }

  return (
    <TableScreen>
      <TableScreenHeader>
        <TableScreenTitle
          action={
            <Button
              color="neutral"
              size="sm"
              variant="fill"
              render={<Link to={paths.app.planeadorActividades.getHref()} />}
            >
              Cerrar
            </Button>
          }
        >
          Planeador
        </TableScreenTitle>
        <NoticeOutlet className="mx-(--screen-spacing) my-4" />
      </TableScreenHeader>
      <TableScreenBody className="rounded-b-none border-b-0">
        {isPendingCompleto && (
          <div className="text-muted-foreground flex items-center justify-center gap-2 px-6 py-12 text-sm">
            <Spinner /> Cargando actividad…
          </div>
        )}

        {isError && (
          <p className="text-red px-6 py-12 text-center text-sm">
            Ocurrió un error al cargar la actividad.
          </p>
        )}

        {!isPendingCompleto && actividadParaForm && (
          <EditarActividadForm
            key={actividadParaForm.id}
            actividad={actividadParaForm}
            formId={FORM_ID}
            onDirtyChange={setIsDirty}
            onSubmit={handleSubmit}
          />
        )}
      </TableScreenBody>

      {/* El footer es el que avisa y guarda; aparece solo cuando hay cambios.
          Sigue el patrón de `add-establishment-page`: siempre está montado
          (preserva el layout del `TableScreen`), pero su contenido solo
          pinta el aviso + el Guardar cuando `isDirty`. */}
      <TableScreenFooter>
        {isDirty ? (
          <>
            <p className="text-sm">Se detectaron cambios. Guardar para conservar la información.</p>
            <Button
              type="submit"
              form={FORM_ID}
              color="primary"
              variant="fill"
              size="sm"
              disabled={updateMutation.isPending || isSavingUnidad}
            >
              {updateMutation.isPending || isSavingUnidad ? (
                <SpinnerIcon data-icon="inline-start" className="animate-spin" />
              ) : (
                <CheckIcon data-icon="inline-start" />
              )}
              {updateMutation.isPending || isSavingUnidad ? "Guardando..." : "Guardar"}
            </Button>
          </>
        ) : (
          <span />
        )}
      </TableScreenFooter>
    </TableScreen>
  )
}
