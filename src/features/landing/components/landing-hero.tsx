import icon from "@/assets/icon.svg"

const SIDEBAR_ITEMS = [
  "PLANEACIÓN",
  "SALA VIRTUAL",
  "ASISTENCIAS",
  "EVALUACIÓN",
  "CONVIVENCIA",
]

const BAR_HEIGHTS = [30, 60, 45, 80, 55, 70, 40]

export function LandingHero() {
  return (
    <section className="flex min-h-screen items-center bg-[#1e2235] px-8 pt-20 md:px-16">
      <div className="mx-auto flex w-full max-w-7xl flex-col items-center gap-12 md:flex-row">
        <div className="flex-1 text-center md:text-left">
          <h1 className="text-4xl leading-tight font-bold text-white md:text-5xl">
            Colombia Evaluadora
            <br />
            ETC
          </h1>
        </div>

        <div className="hidden flex-1 justify-center md:flex">
          <div className="relative w-full max-w-lg">
            <div className="rotate-1 rounded-2xl border border-white/10 bg-[#2a3050] p-3 shadow-2xl">
              <div className="overflow-hidden rounded-xl bg-white">
                <div className="flex h-72">
                  <div className="flex w-36 flex-col gap-1 border-r border-gray-200 bg-[#f5f6fa] p-2">
                    <div className="mb-1 px-1 text-[9px] font-semibold text-gray-500">
                      MENU PRINCIPAL
                    </div>
                    <div className="flex items-center gap-1 rounded bg-[#3542B9] px-2 py-1 text-[9px] text-white">
                      <span>▦</span> TABLERO DE CONTROL
                    </div>
                    {SIDEBAR_ITEMS.map((item) => (
                      <div
                        key={item}
                        className="flex items-center gap-1 px-2 py-1 text-[9px] text-gray-600"
                      >
                        <span>☐</span> {item}
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-1 flex-col gap-2 p-3">
                    <div className="flex items-center justify-between border-b pb-1">
                      <span className="text-[10px] font-bold text-gray-800">
                        Tablero de control
                      </span>
                      <div className="flex items-center gap-1">
                        <img src={icon} alt="" className="h-4" />
                        <span className="text-[8px] text-gray-600">
                          IE SOLEDAD ACOSTA
                        </span>
                      </div>
                    </div>

                    <div className="relative flex-1 overflow-hidden rounded-lg bg-teal-50">
                      <svg viewBox="0 0 200 80" className="h-full w-full opacity-70">
                        <polyline
                          points="0,60 40,40 80,50 120,20 160,35 200,15"
                          fill="none"
                          stroke="#14b8a6"
                          strokeWidth="2"
                        />
                        <polyline
                          points="0,60 40,40 80,50 120,20 160,35 200,15 200,80 0,80"
                          fill="#ccfbf1"
                          stroke="none"
                        />
                      </svg>
                    </div>

                    <div className="flex h-10 items-end gap-1 px-1">
                      {BAR_HEIGHTS.map((h, i) => (
                        <div
                          key={i}
                          className="flex-1 rounded-sm bg-teal-300 opacity-70"
                          style={{ height: `${h}%` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="absolute -top-4 -right-4 flex h-14 w-14 items-center justify-center rounded-full border-2 border-white/10 bg-[#2a3050]">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#3542B9]">
                <span className="text-xs text-white">+</span>
              </div>
            </div>
            <div className="absolute top-1/2 -right-6 h-8 w-8 rounded-full border border-white/10 bg-[#2a3050]" />
            <div className="absolute -bottom-4 left-1/2 h-6 w-6 rounded-full border border-white/10 bg-[#2a3050]" />
          </div>
        </div>
      </div>
    </section>
  )
}
