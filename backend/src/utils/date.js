const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const timezone = require("dayjs/plugin/timezone");

const { fortalezaTz } = require("../config");

dayjs.extend(utc);
dayjs.extend(timezone);

function nowInFortaleza() {
  return dayjs().tz(fortalezaTz);
}

function parseDateInFortaleza(dateInput) {
  return dayjs.tz(dateInput, "YYYY-MM-DD", fortalezaTz).startOf("day");
}

function normalizeAfastamentoDates(startDateInput, endDateInput) {
  const start = parseDateInFortaleza(startDateInput);
  const end = endDateInput ? parseDateInFortaleza(endDateInput) : start;

  if (!start.isValid() || !end.isValid()) {
    return { error: "Data inválida." };
  }

  if (end.isBefore(start)) {
    return { error: "Data final não pode ser anterior à data inicial." };
  }

  const totalDays = end.diff(start, "day") + 1;

  return {
    startDate: start.toDate(),
    endDate: end.toDate(),
    totalDays,
  };
}

function formatBrazilDate(dateInput) {
  return dayjs(dateInput).tz(fortalezaTz).format("DD/MM/YYYY");
}

function formatBrazilDateTime(dateInput) {
  return dayjs(dateInput).tz(fortalezaTz).format("DD/MM/YYYY HH:mm");
}

module.exports = {
  nowInFortaleza,
  parseDateInFortaleza,
  normalizeAfastamentoDates,
  formatBrazilDate,
  formatBrazilDateTime,
};

