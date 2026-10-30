// Imprime el catálogo de rutas del asistente como JSON para ai-control-service
// (`src/main/resources/agente/catalogo-rutas.json`). Uso:
//   node --experimental-strip-types scripts/catalogo-rutas-json.ts > catalogo-rutas.json
import { CATALOGO_RUTAS } from "../src/features/assistant/lib/catalogo-rutas.ts"

process.stdout.write(JSON.stringify(CATALOGO_RUTAS, null, 2) + "\n")
