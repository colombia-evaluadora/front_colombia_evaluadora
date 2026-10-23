import { useMenuPermission } from "@/features/navigation/api/use-menu-permission"

/**
 * ¿El usuario puede crear establecimientos y cambiar su rector y su
 * secretaria? Lo da Eliminar en el menú ESTABLECIMIENTO: con solo Guardar se
 * editan los datos del EE y el panel de directivos queda en solo lectura. El
 * back exige lo mismo al guardar.
 */
export function usePuedeGestionarDirectivosQuery() {
  const { puedeEliminar, isLoading } = useMenuPermission("ESTABLECIMIENTO")
  return { data: puedeEliminar, isLoading }
}
