// GET /eval-col/usuarios/permisos-menu: una fila por menú al que el usuario
// tiene acceso, con las 4 acciones habilitadas para ÉL en ESE menú.
export interface MenuPermission {
  pk_tmenu: number
  codigo: string
  nombre: string
  path: string
  puede_crear: boolean
  puede_editar: boolean
  puede_eliminar: boolean
  puede_ver: boolean
}
