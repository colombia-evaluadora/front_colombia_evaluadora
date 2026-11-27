import { useState } from "react"
import { Link } from "@tanstack/react-router"

import { TableScreenTabs, TableScreenTitle } from "@/components/layout/table-screen"
import { NoticeProvider } from "@/components/notice/notice-context"
import { OnlineOnlyAction } from "@/components/offline/online-only-action"
import { Button } from "@/components/ui/button"
import { ControlPointIcon } from "@/components/ui/icons"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { paths } from "@/config/paths"
import { coberturaComplementariaRoute } from "@/router"

import type { PestanaComplementaria } from "@/features/coverage/matricula-complementaria/api/schema"
import { ContinuidadTab } from "@/features/coverage/matricula-complementaria/components/continuidad-tab"
import { ConveniosTab } from "@/features/coverage/matricula-complementaria/components/convenios-tab"
import {
  DialogCambiarCupoPorId,
  DialogPostulacion,
} from "@/features/coverage/matricula-complementaria/components/dialog-postulacion"
import { DialogNuevoConvenio } from "@/features/coverage/matricula-complementaria/components/dialogs-convenio"
import { PostulacionesTab } from "@/features/coverage/matricula-complementaria/components/postulaciones-tab"
import { ConvocatoriasTab, MENU_COMPLEMENTARIA } from "@/features/coverage/matricula-complementaria/components/convocatorias-tab"
import { useMenuPermission } from "@/features/navigation/api/use-menu-permission"

const PESTANAS: { value: PestanaComplementaria; label: string }[] = [
  { value: "convocatorias", label: "Convocatorias" },
  { value: "postulaciones", label: "Postulaciones" },
  { value: "convenios", label: "Convenios de adscripción" },
  { value: "continuidad", label: "Continuidad" },
]

/**
 * Vista Matrícula complementaria (Sección 2.16; Administración del Sistema, 4.3):
 * solo para la adscripción. La complementaria del estudiante propio se agrega
 * desde la vista Matrícula; todas se ven allí con su badge.
 */
export function MatriculaComplementariaPage() {
  return (
    <NoticeProvider>
      <Contenido />
    </NoticeProvider>
  )
}

function Contenido() {
  const { tab = "convocatorias", postular, cambiarCupo } = coberturaComplementariaRoute.useSearch()
  const navigate = coberturaComplementariaRoute.useNavigate()
  const { puedeCrear } = useMenuPermission(MENU_COMPLEMENTARIA)
  const [nuevoConvenio, setNuevoConvenio] = useState(false)
  // Nueva postulación y Cambiar cupo van en modal; la URL lo abre para que sirvan los enlaces directos.
  const cerrarPostulacion = () =>
    navigate({ search: (prev) => ({ ...prev, postular: undefined, cambiarCupo: undefined }), replace: true })

  // Botón de crear de cada pestaña: va en su barra, a la derecha del buscador (CLAUDE.md §13).
  const accion =
    tab === "convenios" && puedeCrear ? (
      <OnlineOnlyAction>
        <Button type="button" variant="fill" color="primary" size="sm" onClick={() => setNuevoConvenio(true)}>
          <ControlPointIcon data-icon="inline-start" />
          Nuevo convenio
        </Button>
      </OnlineOnlyAction>
    ) : tab === "postulaciones" && puedeCrear ? (
      <OnlineOnlyAction>
        <Button
          type="button"
          variant="fill"
          color="primary"
          size="sm"
          onClick={() => navigate({ search: (prev) => ({ ...prev, postular: true }) })}
        >
          <ControlPointIcon data-icon="inline-start" />
          Nueva postulación
        </Button>
      </OnlineOnlyAction>
    ) : tab === "convocatorias" && puedeCrear ? (
      <OnlineOnlyAction>
        <Button
          render={<Link to={paths.app.coberturaConvocatoriaNueva.getHref()} />}
          nativeButton={false}
          variant="fill"
          color="primary"
          size="sm"
        >
          <ControlPointIcon data-icon="inline-start" />
          Nueva convocatoria
        </Button>
      </OnlineOnlyAction>
    ) : null

  const encabezado = (
    <>
      <TableScreenTitle>Matrícula complementaria</TableScreenTitle>
      <TableScreenTabs>
        <Tabs
          value={tab}
          onValueChange={(value) =>
            navigate({ search: { tab: value === "convocatorias" ? undefined : (value as PestanaComplementaria) } })
          }
        >
          <TabsList className="border-b-0">
            {PESTANAS.map((p) => (
              <TabsTrigger key={p.value} value={p.value}>
                {p.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </TableScreenTabs>
    </>
  )

  if (tab === "convocatorias") return <ConvocatoriasTab encabezado={encabezado} accion={accion} />
  if (tab === "postulaciones")
    return (
      <>
        <PostulacionesTab encabezado={encabezado} accion={accion} />
        {postular ? <DialogPostulacion onOpenChange={(open) => !open && cerrarPostulacion()} /> : null}
        {cambiarCupo != null ? (
          <DialogCambiarCupoPorId id={cambiarCupo} onOpenChange={(open) => !open && cerrarPostulacion()} />
        ) : null}
      </>
    )
  if (tab === "convenios")
    return (
      <>
        <ConveniosTab encabezado={encabezado} accion={accion} />
        {nuevoConvenio ? <DialogNuevoConvenio onOpenChange={setNuevoConvenio} /> : null}
      </>
    )
  return <ContinuidadTab encabezado={encabezado} />
}
