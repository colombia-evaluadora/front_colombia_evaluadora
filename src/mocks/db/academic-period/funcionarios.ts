export interface FuncionarioRecord {
  id: number
  nombre: string
  identificacion: string
}

// Catálogo mínimo de funcionarios (`fn_funcionario_sede_listar`) — separado
// del módulo Employees (ids UUID, sin FK_TFUNCIONARIO real): esto simula la
// tabla TFUNCIONARIO con ids numéricos, que es lo que usa el combobox de
// director de grupo. El mock ignora la sede (igual que `especialidades.ts`
// ignora el periodo) y devuelve el mismo catálogo para cualquier sede de
// prueba.
export const funcionariosDb: FuncionarioRecord[] = [
  { id: 1, nombre: "Ana María Restrepo", identificacion: "1000111222" },
  { id: 2, nombre: "Carlos Andrés Gómez", identificacion: "1000333444" },
  { id: 3, nombre: "Laura Sofía Martínez", identificacion: "1000555666" },
]
