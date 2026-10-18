"use client"
import { Target, Wallet, Receipt, HandCoins, CalendarDays, Calculator, ArrowRight } from "lucide-react"
import {
  useBudgetBriefData,
  useGoalBriefData,
  useBillBriefData,
  useUtangBriefData,
  useEventBriefData,
} from "@/components/PlanBriefSignal"
import { hasFeature } from "@/lib/featureAccess"

const SECTION_FEATURES = {
  goal: "goals",
  budget: "budgets",
  tagihan: "bills",
  utang: "debts",
  event: "momental",
}

const CARD_META = {
  goal: { label: "Target", icon: Target, card: "bg-sage-100", tile: "bg-white/70 text-sage-700" },
  budget: { label: "Anggaran", icon: Wallet, card: "bg-amber-100", tile: "bg-white/70 text-amber-700" },
  tagihan: { label: "Tagihan", icon: Receipt, card: "bg-clay-100", tile: "bg-white/70 text-clay-600" },
  utang: { label: "Utang & Piutang", icon: HandCoins, card: "bg-rose-100", tile: "bg-white/70 text-rose-700" },
  event: { label: "Event", icon: CalendarDays, card: "bg-indigo-100", tile: "bg-white/70 text-indigo-700" },
  simulasi: { label: "Simulasi", icon: Calculator, card: null, tile: "bg-violet-100 text-violet-700" },
}

function HubCardButton({ label, available, onOpen, span, dark, fill, children }) {
  return (
    <button
      type="button"
      disabled={!available}
      onClick={() => available && onOpen()}
      aria-label={`${available ? "Buka" : "Fitur terkunci"} ${label}`}
      className={`bento-tile p-4 text-left transition-transform active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${span ? "col-span-2" : ""} ${dark ? "border border-[#1F2D28] bg-[#1F2D28] text-white" : `border border-md3-outline-variant ${fill || "bg-md3-surface-container-lowest"}`}`}
    >
      {children}
    </button>
  )
}

function CardTag({ cardKey, dark }) {
  const { label, icon: Icon, tile } = CARD_META[cardKey]
  return (
    <p className="flex items-center gap-1.5">
      <span data-plan-icon-tile className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-xl ${tile}`}>
        <Icon size={14} strokeWidth={2.1} aria-hidden="true" />
      </span>
      <span className={`text-[10px] font-bold uppercase tracking-[0.12em] ${dark ? "text-white/60" : "text-md3-on-surface-variant"}`}>
        {label}
      </span>
    </p>
  )
}

function ProgressBar({ pct, barClass, label }) {
  const clamped = Math.min(100, Math.max(0, Number(pct) || 0))
  return (
    <div
      className="mt-2.5 h-2 overflow-hidden rounded-full bg-md3-surface-container-high"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clamped}
      aria-label={label}
    >
      <div className={`h-full rounded-full ${barClass}`} style={{ width: `${clamped}%` }} />
    </div>
  )
}

function CardCta({ dark, children }) {
  return (
    <p className={`mt-2.5 inline-flex items-center gap-1 text-xs font-bold ${dark ? "text-white" : "text-md3-on-surface"}`}>
      {children}
      <ArrowRight size={13} aria-hidden="true" />
    </p>
  )
}

function CardEmpty({ value, detail, cta }) {
  return (
    <>
      <p className="mt-2 text-sm font-bold text-md3-on-surface">{value}</p>
      {detail ? <p className="mt-0.5 text-xs leading-relaxed text-md3-on-surface-variant">{detail}</p> : null}
      <CardCta>{cta}</CardCta>
    </>
  )
}

function TargetCard({ data, available, onOpen }) {
  const g = data.goal
  return (
    <HubCardButton label="Target" available={available} onOpen={onOpen} span fill={CARD_META.goal.card}>
      <CardTag cardKey="goal" />
      {data.status === "loading" ? (
        <p className="mt-2 text-sm font-semibold text-md3-on-surface-variant">{data.value}</p>
      ) : g ? (
        <>
          <p className="mt-2 truncate text-sm font-bold text-md3-on-surface">{g.nama}</p>
          <p className="mt-1 font-display text-[1.55rem] font-bold tabular-nums text-md3-on-surface">
            {g.savedLabel} <span className="font-sans text-sm font-semibold text-md3-on-surface-variant">/ {g.targetLabel}</span>
          </p>
          <ProgressBar pct={g.percent} barClass="bg-sage-500" label={`Progres target ${g.nama}`} />
          <div className="mt-1.5 flex items-center justify-between text-[11px] font-bold text-md3-on-surface-variant">
            <span>{g.percent}% tercapai</span>
            {g.etaMonths > 0 ? <span>± {g.etaMonths} bln lagi</span> : null}
          </div>
          <CardCta>Kelola target</CardCta>
        </>
      ) : (
        <CardEmpty value={data.value} detail={data.detail} cta="Buat target" />
      )}
    </HubCardButton>
  )
}

function BudgetCard({ data, available, onOpen }) {
  const s = data.summary
  return (
    <HubCardButton label="Anggaran" available={available} onOpen={onOpen} span fill={CARD_META.budget.card}>
      <CardTag cardKey="budget" />
      {data.status === "loading" ? (
        <p className="mt-2 text-sm font-semibold text-md3-on-surface-variant">{data.value}</p>
      ) : s ? (
        <>
          <p className="mt-1 font-display text-[1.55rem] font-bold tabular-nums text-md3-on-surface">
            {s.spentLabel} <span className="font-sans text-sm font-semibold text-md3-on-surface-variant">/ {s.limitLabel} terpakai</span>
          </p>
          <ProgressBar pct={s.pct} barClass="bg-amber-400" label="Persentase anggaran terpakai" />
          <div className="mt-2 space-y-1.5">
            {data.items.map(item => {
              const hot = item.pct >= 90
              return (
                <div key={item.kategori} className="flex items-center gap-2">
                  <span className="w-[86px] flex-shrink-0 truncate text-[11px] font-semibold text-md3-on-surface-variant">{item.kategori}</span>
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-md3-surface-container-high">
                    <span className={`block h-full rounded-full ${hot ? "bg-clay-500" : "bg-amber-400"}`} style={{ width: `${Math.min(100, item.pct)}%` }} />
                  </span>
                  <span className={`w-9 flex-shrink-0 text-right text-[11px] font-bold tabular-nums ${hot ? "text-clay-600" : "text-md3-on-surface-variant"}`}>
                    {item.pct}%
                  </span>
                </div>
              )
            })}
          </div>
          <CardCta>Lihat anggaran</CardCta>
        </>
      ) : (
        <CardEmpty value={data.value} detail={data.detail} cta="Buat anggaran" />
      )}
    </HubCardButton>
  )
}

function BillCard({ data, available, onOpen }) {
  const b = data.bill
  return (
    <HubCardButton label="Tagihan" available={available} onOpen={onOpen} fill={CARD_META.tagihan.card}>
      <CardTag cardKey="tagihan" />
      {data.status === "loading" ? (
        <p className="mt-2 text-sm font-semibold text-md3-on-surface-variant">{data.value}</p>
      ) : b ? (
        <>
          <p className="mt-2 truncate text-sm font-bold text-md3-on-surface">{b.nama}</p>
          <p className="mt-1 font-display text-[1.4rem] font-bold tabular-nums text-md3-on-surface">{b.jumlahLabel}</p>
          <p className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold ${b.urgent || b.overdue ? "bg-clay-500 text-white" : "bg-md3-surface-container-high text-md3-on-surface-variant"}`}>
            {b.overdue ? `Terlambat ${Math.abs(b.daysUntilDue)} hari` : b.dueLabel}
          </p>
          <span className="block"><CardCta>{b.urgent || b.overdue ? "Bayar" : "Lihat"}</CardCta></span>
        </>
      ) : (
        <CardEmpty value={data.value} detail={data.detail} cta="Tambah tagihan" />
      )}
    </HubCardButton>
  )
}

function UtangCard({ data, available, onOpen }) {
  const s = data.split
  return (
    <HubCardButton label="Utang & Piutang" available={available} onOpen={onOpen} fill={CARD_META.utang.card}>
      <CardTag cardKey="utang" />
      {data.status === "loading" ? (
        <p className="mt-2 text-sm font-semibold text-md3-on-surface-variant">{data.value}</p>
      ) : s && s.count > 0 ? (
        <>
          <div className="mt-2.5 grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-white/60 px-2.5 py-2">
              <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-md3-on-surface-variant">Utangku</p>
              <p className="mt-0.5 font-display text-[15px] font-bold tabular-nums text-rose-700">{s.utangLabel}</p>
            </div>
            <div className="rounded-xl bg-white/60 px-2.5 py-2">
              <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-md3-on-surface-variant">Piutang</p>
              <p className="mt-0.5 font-display text-[15px] font-bold tabular-nums text-sage-700">{s.piutangLabel}</p>
            </div>
          </div>
          <CardCta>Kelola</CardCta>
        </>
      ) : (
        <CardEmpty value={data.value} detail={data.detail} cta="Kelola" />
      )}
    </HubCardButton>
  )
}

function EventCard({ data, available, onOpen }) {
  const e = data.event
  return (
    <HubCardButton label="Event" available={available} onOpen={onOpen} fill={CARD_META.event.card}>
      <CardTag cardKey="event" />
      {data.status === "loading" ? (
        <p className="mt-2 text-sm font-semibold text-md3-on-surface-variant">{data.value}</p>
      ) : e ? (
        <>
          <p className="mt-2 truncate text-sm font-bold text-md3-on-surface">{e.nama}</p>
          <p className="mt-1 font-display text-[1.4rem] font-bold tabular-nums text-md3-on-surface">
            {e.savedLabel} <span className="font-sans text-xs font-semibold text-md3-on-surface-variant">/ {e.totalLabel}</span>
          </p>
          <ProgressBar pct={e.pct} barClass="bg-indigo-500" label={`Dana event ${e.nama} terkumpul`} />
          <div className="mt-1.5 flex items-center justify-between text-[11px] font-bold text-md3-on-surface-variant">
            <span>{e.pct}%</span>
            {e.deadlineLabel ? <span>{e.deadlineLabel}</span> : null}
          </div>
          <CardCta>Detail</CardCta>
        </>
      ) : (
        <CardEmpty value={data.value} detail={data.detail} cta="Buat event" />
      )}
    </HubCardButton>
  )
}

function SimulasiCard({ available, proLocked, onOpen }) {
  return (
    <HubCardButton label="Simulasi" available={available} onOpen={onOpen} dark={available}>
      <CardTag cardKey="simulasi" dark={available} />
      {available ? (
        <>
          <p className="mt-2 text-sm font-bold text-white">Kebebasan finansial</p>
          <p className="mt-0.5 text-xs leading-relaxed text-white/70">Target bebas finansial & What-If.</p>
          <p className="mt-2.5 inline-flex items-center gap-1 text-xs font-bold text-white">
            Buka simulasi
            <ArrowRight size={13} aria-hidden="true" />
          </p>
          {proLocked ? (
            <span className="ml-2 inline-flex rounded-full bg-violet-100 px-2.5 py-1 text-[10px] font-bold text-violet-700">Pro</span>
          ) : null}
        </>
      ) : (
        <>
          <p className="mt-2 text-sm font-bold text-md3-on-surface">Segera hadir.</p>
          <p className="mt-0.5 text-xs leading-relaxed text-md3-on-surface-variant">Simulasi tersedia bila fiturnya aktif.</p>
        </>
      )}
    </HubCardButton>
  )
}

export default function PlanHubCards({
  selectedMonth,
  selectedYear,
  selectedAccount,
  transactions,
  allocations,
  bills,
  billsLoading,
  billsError,
  moneyHidden,
  entitlement,
  simulationAvailable,
  simulationProLocked,
  onOpen,
}) {
  const budget = useBudgetBriefData({ selectedMonth, selectedYear, selectedAccount, transactions, moneyHidden })
  const goal = useGoalBriefData({ allocations, moneyHidden })
  const bill = useBillBriefData({ bills, billsLoading, billsError, moneyHidden })
  const utang = useUtangBriefData({ moneyHidden })
  const event = useEventBriefData({ moneyHidden })

  const availableFor = (key) => key === "simulasi"
    ? simulationAvailable
    : hasFeature(entitlement, SECTION_FEATURES[key])

  return (
    <section aria-label="Ringkasan Rencana">
      <div className="grid grid-cols-2 gap-2.5">
        <TargetCard data={goal} available={availableFor("goal")} onOpen={() => onOpen("goal")} />
        <BudgetCard data={budget} available={availableFor("budget")} onOpen={() => onOpen("budget")} />
        <BillCard data={bill} available={availableFor("tagihan")} onOpen={() => onOpen("tagihan")} />
        <UtangCard data={utang} available={availableFor("utang")} onOpen={() => onOpen("utang")} />
        <EventCard data={event} available={availableFor("event")} onOpen={() => onOpen("event")} />
        <SimulasiCard available={availableFor("simulasi")} proLocked={simulationProLocked} onOpen={() => onOpen("simulasi")} />
      </div>
    </section>
  )
}
