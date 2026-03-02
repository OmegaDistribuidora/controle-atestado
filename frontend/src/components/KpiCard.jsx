export default function KpiCard({ label, value }) {
  return (
    <article className="kpi-card">
      <p>{label}</p>
      <strong>{value}</strong>
    </article>
  );
}
