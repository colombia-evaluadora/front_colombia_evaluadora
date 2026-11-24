import type { CapacidadesGe } from "@/features/gestion-estudiantil/commons/api/use-capacidades-ge"

/**
 * Banderas por caso (fila del listado y detalle): las decide el backend con la misma regla que los gates
 * (`fn_convivencia_caso_puede_acciones`); todas son FALSE en un caso Cerrado o Anulado.
 */
export interface BanderasCaso {
  puede_modificar: boolean
  puede_corregir_fechas: boolean
  puede_registrar_accion: boolean
  puede_asignar_gestor: boolean
  puede_reasignar: boolean
  puede_cambiar_tipo: boolean
  puede_cerrar: boolean
  puede_anular: boolean
  puede_abrir_proceso: boolean
}

export const SIN_BANDERAS: BanderasCaso = {
  puede_modificar: false,
  puede_corregir_fechas: false,
  puede_registrar_accion: false,
  puede_asignar_gestor: false,
  puede_reasignar: false,
  puede_cambiar_tipo: false,
  puede_cerrar: false,
  puede_anular: false,
  puede_abrir_proceso: false,
}

/** Banderas de una fila o del detalle; lo que el backend no trae se toma como «no puede». */
export function banderasDe(origen: Partial<BanderasCaso> | null | undefined): BanderasCaso {
  return {
    puede_modificar: origen?.puede_modificar === true,
    puede_corregir_fechas: origen?.puede_corregir_fechas === true,
    puede_registrar_accion: origen?.puede_registrar_accion === true,
    puede_asignar_gestor: origen?.puede_asignar_gestor === true,
    puede_reasignar: origen?.puede_reasignar === true,
    puede_cambiar_tipo: origen?.puede_cambiar_tipo === true,
    puede_cerrar: origen?.puede_cerrar === true,
    puede_anular: origen?.puede_anular === true,
    puede_abrir_proceso: origen?.puede_abrir_proceso === true,
  }
}

interface PermisoMenu {
  puedeVer: boolean
  puedeCrear: boolean
  puedeEditar: boolean
}

/**
 * Acciones de página de Convivencia: las capacidades las decide el backend (`GET /capacidades`) y se combinan con
 * el permiso del menú. Sin capacidades (cargando o con error) todo queda deshabilitado.
 */
export function accesoConvivencia(cap: Partial<CapacidadesGe> | undefined, permiso: PermisoMenu) {
  return {
    puedeCrear: permiso.puedeCrear && cap?.convivencia_puede_crear_caso === true,
    puedeExportarSiuce: permiso.puedeVer && cap?.convivencia_puede_exportar_siuce === true,
    puedeAbrirProceso: permiso.puedeCrear && cap?.convivencia_puede_abrir_proceso === true,
    puedeVerComite: permiso.puedeVer && cap?.comite_puede_ver === true,
    puedeGestionarComite: permiso.puedeEditar && cap?.comite_puede_gestionar === true,
  }
}
