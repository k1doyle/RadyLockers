import { quarters, programs, rentalPeriods } from '@/lib/constants';
import { cn } from '@/lib/utils';

const inputClassName =
  'mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20';

function getFieldClassName(error?: string | null) {
  return cn(
    inputClassName,
    error && 'border-rose-300 bg-rose-50/30 focus:border-rose-400 focus:ring-rose-200',
  );
}

export function TextField({
  name,
  label,
  placeholder,
  required = false,
  type = 'text',
  defaultValue,
  error,
}: {
  name: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  type?: string;
  defaultValue?: string | number | null;
  error?: string | null;
}) {
  const errorId = `${name}-error`;

  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        defaultValue={defaultValue ?? undefined}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? errorId : undefined}
        className={getFieldClassName(error)}
      />
      {error ? <p id={errorId} className="mt-2 text-sm font-normal text-rose-700">{error}</p> : null}
    </label>
  );
}

export function TextAreaField({
  name,
  label,
  placeholder,
  defaultValue,
  error,
}: {
  name: string;
  label: string;
  placeholder?: string;
  defaultValue?: string | null;
  error?: string | null;
}) {
  const errorId = `${name}-error`;

  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <textarea
        name={name}
        placeholder={placeholder}
        defaultValue={defaultValue ?? undefined}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? errorId : undefined}
        className={cn(getFieldClassName(error), 'min-h-28')}
      />
      {error ? <p id={errorId} className="mt-2 text-sm font-normal text-rose-700">{error}</p> : null}
    </label>
  );
}

export function SelectField({
  name,
  label,
  options,
  required = false,
  defaultValue,
  error,
}: {
  name: string;
  label: string;
  options: readonly string[];
  required?: boolean;
  defaultValue?: string | null;
  error?: string | null;
}) {
  const errorId = `${name}-error`;

  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <select
        name={name}
        required={required}
        defaultValue={defaultValue ?? undefined}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? errorId : undefined}
        className={getFieldClassName(error)}
      >
        {!required ? <option value="">Select an option</option> : null}
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      {error ? <p id={errorId} className="mt-2 text-sm font-normal text-rose-700">{error}</p> : null}
    </label>
  );
}

export function ProgramSelect({ defaultValue, error }: { defaultValue?: string | null; error?: string | null }) {
  return <SelectField name="program" label="Program" options={programs} required defaultValue={defaultValue} error={error} />;
}

export function QuarterSelect({ defaultValue, error }: { defaultValue?: string | null; error?: string | null }) {
  return <SelectField name="requested_quarter" label="Requested quarter" options={quarters} required defaultValue={defaultValue} error={error} />;
}

export function RentalPeriodSelect({ defaultValue, error }: { defaultValue?: string | null; error?: string | null }) {
  return <SelectField name="requested_rental_period" label="Requested Rental Period" options={rentalPeriods} required defaultValue={defaultValue} error={error} />;
}
