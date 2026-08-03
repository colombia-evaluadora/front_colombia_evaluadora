// Opción de especialidad tal como la entrega el backend: `key` es el valor que
// se guarda/manda, `label` el texto visible. Es una lista de texto libre (el
// usuario puede agregar nuevas), por lo que en la práctica `key` y `label`
// coinciden con el nombre.
export interface EspecialidadOption {
  key: string
  label: string
}
