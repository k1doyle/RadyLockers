export function MetricCard({
  label,
  value,
  description,
  tone = 'border-slate-200',
}: {
  label: string;
  value: string | number;
  description: string;
  tone?: string;
}) {
  return (
    <div className={`rounded-2xl border bg-white p-5 shadow-sm ${tone}`}>
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-brand-navy">{value}</p>
      <p className="mt-2 text-sm text-slate-500">{description}</p>
    </div>
  );
}
