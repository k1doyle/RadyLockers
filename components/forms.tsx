import { quarters, programs } from '@/lib/constants';

const inputClassName =
  'mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20';

export function TextField({
  name,
  label,
  placeholder,
  required = false,
  type = 'text',
  defaultValue,
}: {
  name: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  type?: string;
  defaultValue?: string | number | null;
}) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <input name={name} type={type} placeholder={placeholder} required={required} defaultValue={defaultValue ?? undefined} className={inputClassName} />
    </label>
  );
}

export function TextAreaField({
  name,
  label,
  placeholder,
  defaultValue,
}: {
  name: string;
  label: string;
  placeholder?: string;
  defaultValue?: string | null;
}) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <textarea name={name} placeholder={placeholder} defaultValue={defaultValue ?? undefined} className={`${inputClassName} min-h-28`} />
    </label>
  );
}

export function SelectField({
  name,
  label,
  options,
  required = false,
  defaultValue,
}: {
  name: string;
  label: string;
  options: string[];
  required?: boolean;
  defaultValue?: string | null;
}) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <select name={name} required={required} defaultValue={defaultValue ?? undefined} className={inputClassName}>
        {!required ? <option value="">Select an option</option> : null}
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

export function ProgramSelect({ defaultValue }: { defaultValue?: string | null }) {
  return <SelectField name="program" label="Program" options={programs} required defaultValue={defaultValue} />;
}

export function QuarterSelect({ defaultValue }: { defaultValue?: string | null }) {
  return <SelectField name="requested_quarter" label="Requested quarter" options={quarters} required defaultValue={defaultValue} />;
}
