export default function FilterBar({
  filters,
  setFilters,
  onApply,
  onReset,
  showTotalDays = true,
  searchLabel = "Buscar funcionario / CPF / CID",
  searchPlaceholder = "Ex: Joao, 123..., M54",
}) {
  return (
    <section className="filter-bar">
      <div className="filter-grid">
        <label>
          {searchLabel}
          <input
            type="text"
            value={filters.search}
            onChange={(e) => setFilters((old) => ({ ...old, search: e.target.value }))}
            placeholder={searchPlaceholder}
          />
        </label>

        {showTotalDays && (
          <label>
            Dias totais do atestado
            <input
              type="number"
              min="1"
              value={filters.totalDays}
              onChange={(e) => setFilters((old) => ({ ...old, totalDays: e.target.value }))}
              placeholder="Ex: 10"
            />
          </label>
        )}

        <label>
          Periodo
          <select value={filters.period} onChange={(e) => setFilters((old) => ({ ...old, period: e.target.value }))}>
            <option value="">Todos</option>
            <option value="today">Hoje</option>
            <option value="7days">7 dias</option>
            <option value="month">Mes atual</option>
            <option value="custom">Personalizado</option>
          </select>
        </label>

        {filters.period === "custom" && (
          <>
            <label>
              De
              <input
                type="date"
                value={filters.customFrom}
                onChange={(e) => setFilters((old) => ({ ...old, customFrom: e.target.value }))}
              />
            </label>

            <label>
              Ate
              <input
                type="date"
                value={filters.customTo}
                onChange={(e) => setFilters((old) => ({ ...old, customTo: e.target.value }))}
              />
            </label>
          </>
        )}
      </div>

      <div className="filter-actions">
        <button className="primary-btn" onClick={onApply}>
          Aplicar filtros
        </button>
        <button className="ghost-btn" onClick={onReset}>
          Limpar
        </button>
      </div>
    </section>
  );
}
