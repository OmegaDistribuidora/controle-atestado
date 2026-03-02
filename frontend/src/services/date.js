function pad(value) {
  return String(value).padStart(2, "0");
}

export function formatDate(dateInput) {
  if (!dateInput) return "-";
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return "-";

  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

export function formatDateTime(dateInput) {
  if (!dateInput) return "-";
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return "-";

  const options = {
    timeZone: "America/Fortaleza",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  };

  return new Intl.DateTimeFormat("pt-BR", options).format(date);
}

export function getTodayFortalezaLabel() {
  const date = new Date();
  const options = {
    timeZone: "America/Fortaleza",
    day: "2-digit",
    month: "long",
    year: "numeric",
  };

  return new Intl.DateTimeFormat("pt-BR", options).format(date);
}

export function calculateAfastamentoInfo(startDate, endDate) {
  if (!startDate) return null;

  const start = new Date(`${startDate}T00:00:00`);
  const end = endDate ? new Date(`${endDate}T00:00:00`) : new Date(`${startDate}T00:00:00`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return null;
  }

  const oneDayMs = 24 * 60 * 60 * 1000;
  const totalDays = Math.floor((end - start) / oneDayMs) + 1;

  const retorno = new Date(end);
  retorno.setDate(retorno.getDate() + 1);

  return {
    totalDays,
    retornoPrevisto: formatDate(retorno),
  };
}
