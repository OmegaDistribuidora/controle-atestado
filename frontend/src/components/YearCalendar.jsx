const MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Marco",
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

function getCellType(certificateCount, declarationCount) {
  if (certificateCount > 0 && declarationCount > 0) return "mixed";
  if (certificateCount > 0) return "certificate";
  if (declarationCount > 0) return "declaration";
  return "empty";
}

function mixHexColor(fromHex, toHex, t) {
  const from = fromHex.replace("#", "");
  const to = toHex.replace("#", "");

  const fr = Number.parseInt(from.slice(0, 2), 16);
  const fg = Number.parseInt(from.slice(2, 4), 16);
  const fb = Number.parseInt(from.slice(4, 6), 16);

  const tr = Number.parseInt(to.slice(0, 2), 16);
  const tg = Number.parseInt(to.slice(2, 4), 16);
  const tb = Number.parseInt(to.slice(4, 6), 16);

  const r = Math.round(fr + (tr - fr) * t);
  const g = Math.round(fg + (tg - fg) * t);
  const b = Math.round(fb + (tb - fb) * t);

  return `rgb(${r}, ${g}, ${b})`;
}

export default function YearCalendar({
  year,
  certificateCounts = {},
  declarationCounts = {},
  maxTotalCount = 0,
}) {
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
          const certificateCount = certificateCounts[key] || 0;
          const declarationCount = declarationCounts[key] || 0;
          const totalCount = certificateCount + declarationCount;
          const type = getCellType(certificateCount, declarationCount);
          const normalizedIntensity = totalCount > 0 ? totalCount / Math.max(maxTotalCount || 1, 1) : 0;
          const certColor = mixHexColor("#cb945d", "#663b1d", normalizedIntensity);
          const declColor = mixHexColor("#53a8a0", "#1f5753", normalizedIntensity);

          const style = {
            "--cert-color": certColor,
            "--decl-color": declColor,
          };

          cells.push(
            <span
              key={key}
              className={`day-cell ${type !== "empty" ? `has-data ${type}` : ""}`}
              style={type === "empty" ? undefined : style}
            >
              {day}
              {totalCount > 0 && (
                <span className="day-tooltip">
                  <strong>{totalCount} registros no dia</strong>
                  <span>{certificateCount} funcionarios afastados</span>
                  <span>{declarationCount} declaracoes</span>
                </span>
              )}
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
