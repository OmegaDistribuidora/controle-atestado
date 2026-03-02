const MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const WEEK_DAYS = ["D", "S", "T", "Q", "Q", "S", "S"];

function pad(value) {
  return String(value).padStart(2, "0");
}

function daysInMonth(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

export default function YearCalendar({ year, counts }) {
  return (
    <section className="year-grid">
      {MONTHS.map((monthLabel, monthIndex) => {
        const firstDayWeek = new Date(year, monthIndex, 1).getDay();
        const totalDays = daysInMonth(year, monthIndex);

        const cells = [];
        for (let i = 0; i < firstDayWeek; i += 1) {
          cells.push(<span key={`empty-${monthLabel}-${i}`} className="day-cell empty" />);
        }

        for (let day = 1; day <= totalDays; day += 1) {
          const key = `${year}-${pad(monthIndex + 1)}-${pad(day)}`;
          const count = counts[key] || 0;
          const className = count > 0 ? "day-cell active" : "day-cell";

          cells.push(
            <span key={key} className={className} title={count > 0 ? `${count} funcionarios afastados` : ""}>
              {day}
            </span>
          );
        }

        return (
          <article key={monthLabel} className="month-card">
            <h4>{monthLabel}</h4>
            <div className="weekday-row">
              {WEEK_DAYS.map((label) => (
                <span key={`${monthLabel}-${label}`}>{label}</span>
              ))}
            </div>
            <div className="month-days">{cells}</div>
          </article>
        );
      })}
    </section>
  );
}
