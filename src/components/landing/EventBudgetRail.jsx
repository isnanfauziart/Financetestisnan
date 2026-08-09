import { CalendarDays, GraduationCap, HeartHandshake, Moon } from "lucide-react"

const EVENT_ICONS = { sekolah: GraduationCap, lebaran: Moon, keluarga: HeartHandshake }

export default function EventBudgetRail({ events }) {
  return (
    <section className="chapter event-budget" aria-labelledby="events-title">
      <div className="chapter-heading chapter-heading--split">
        <div>
          <p className="eyebrow">Hidup tidak selalu bulanan</p>
          <h2 id="events-title">Satu rencana utuh untuk momen yang penting.</h2>
        </div>
        <p>
          Pisahkan kebutuhan besar dari budget rutin, lalu lihat progres, sisa dana, dan kebutuhan yang masih harus disiapkan.
        </p>
      </div>

      <div className="event-planner">
        <div className="event-selector">
          <div className="event-selector__head"><span>Event budget</span><strong>{events.length} rencana</strong></div>
          {events.map((event, index) => {
            const Icon = EVENT_ICONS[event.id] || CalendarDays
            return (
              <a
                className="event-option"
                href={`#event-${event.id}`}
                key={event.id}
              >
                <div className="event-option__icon"><Icon /></div>
                <div><strong>{event.name}</strong><span>{event.meta}</span></div>
                <i aria-hidden="true">&rarr;</i>
              </a>
            )
          })}
        </div>

        <div className="event-detail-rail">
          {events.map((event, index) => {
            const ActiveIcon = EVENT_ICONS[event.id] || CalendarDays
            return (
              <article className={index === 0 ? "event-detail event-detail--default" : "event-detail"} id={`event-${event.id}`} key={event.id}>
                <div className="event-detail__head">
                  <div className="event-detail__icon"><ActiveIcon /></div>
                  <div><span>{event.status}</span><h3>{event.name}</h3><p>{event.date}</p></div>
                  <span className="status-pill">{event.meta}</span>
                </div>
                <div className="event-summary">
                  <div className="event-ring" style={{ "--event-progress": `${event.progress}%` }}><strong>{event.progress}%</strong></div>
                  <div><span>Terpakai</span><strong>{event.spent}</strong><small>dari {event.target}</small></div>
                  <div><span>Sisa</span><strong>{event.remaining}</strong><small>{event.remainingDetail}</small></div>
                </div>
                <div className="event-subcategories">
                  {event.categories.map(({ name, amount, progress }) => (
                    <div key={name}>
                      <span>{name}<small>{amount}</small></span>
                      <div><i style={{ width: `${progress}%` }} /></div>
                      <strong>{progress}%</strong>
                    </div>
                  ))}
                </div>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
