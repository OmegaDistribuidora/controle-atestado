const dayjs = require("dayjs");
const { parseDateInFortaleza, nowInFortaleza } = require("./date");

function toDateRangeByPeriod(period, customFrom, customTo) {
  if (!period) return null;

  const now = nowInFortaleza();

  if (period === "today") {
    return {
      gte: now.startOf("day").toDate(),
      lte: now.endOf("day").toDate(),
    };
  }

  if (period === "7days") {
    return {
      gte: now.subtract(6, "day").startOf("day").toDate(),
      lte: now.endOf("day").toDate(),
    };
  }

  if (period === "month") {
    return {
      gte: now.startOf("month").toDate(),
      lte: now.endOf("month").toDate(),
    };
  }

  if (period === "custom") {
    if (!customFrom || !customTo) return null;

    const from = parseDateInFortaleza(customFrom);
    const to = parseDateInFortaleza(customTo).endOf("day");
    if (!from.isValid() || !to.isValid()) return null;

    return {
      gte: from.toDate(),
      lte: to.toDate(),
    };
  }

  return null;
}

function buildCertificatesWhere(query) {
  const where = {};

  if (query.search) {
    const search = String(query.search);
    const cpfDigits = search.replace(/\D/g, "");
    const cpfFilters = cpfDigits ? [{ cpf: { contains: cpfDigits } }] : [];

    where.OR = [
      { employeeName: { contains: search, mode: "insensitive" } },
      ...cpfFilters,
      { cid: { contains: search, mode: "insensitive" } },
    ];
  }

  if (query.totalDays) {
    const days = Number(query.totalDays);
    if (!Number.isNaN(days) && days > 0) {
      where.totalDays = days;
    }
  }

  const periodRange = toDateRangeByPeriod(query.period, query.customFrom, query.customTo);
  if (periodRange) {
    where.registrationDate = periodRange;
  }

  return where;
}

function buildPagination(query, fallbackLimit = 20) {
  const limit = Math.min(Math.max(Number(query.limit) || fallbackLimit, 1), 200);
  const page = Math.max(Number(query.page) || 1, 1);
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

module.exports = {
  buildCertificatesWhere,
  buildPagination,
};

