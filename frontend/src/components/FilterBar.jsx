export default function FilterBar({ filters, setFilters, onApply, onReset }) {
  return (
    <section className="filter-bar">
      <div className="filter-grid">
        <label>
          Buscar funcionário / CPF / CID
          <input
            type="text"
            value={filters.search}
            onChange={(e) => setFilters((old) => ({ ...old, search: e.target.value }))}
            placeholder="Ex: João, 123..., M54"
          />
        </label>

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

        <label>
          Período
          <select
            value={filters.period}
            onChange={(e) => setFilters((old) => ({ ...old, period: e.target.value }))}
          >
            <option value="">Todos</option>
            <option value="today">Hoje</option>
            <option value="7days">7 dias</option>
            <option value="month">Mês atual</option>
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
              Até
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
