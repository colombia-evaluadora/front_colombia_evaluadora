// Tipos del Worker de Cloudflare (`worker/index.js`) para importarlo desde los
// tests unitarios (`src/lib/captcha-worker-proxy.test.ts`).
interface WorkerEnv {
  API_PROXY_TARGET: string
  ASSETS: { fetch: (request: Request) => Promise<Response> }
}

declare const worker: {
  fetch(request: Request, env: WorkerEnv): Promise<Response>
}

export default worker
