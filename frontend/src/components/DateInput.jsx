import { Calendar } from 'lucide-react';

export default function DateInput({
  className = '',
  containerClassName = '',
  hideIcon = false,
  ...props
}) {
  const inputClassName = [
    'w-full',
    'rounded-lg',
    'border',
    'border-gray-200',
    'bg-white',
    'py-2.5',
    hideIcon ? 'pl-3' : 'pl-10',
    'pr-3',
    'text-sm',
    'text-gray-900',
    'shadow-sm',
    'transition',
    'focus:border-orange-500',
    'focus:ring-2',
    'focus:ring-orange-100',
    'disabled:bg-gray-100',
    'disabled:text-gray-400',
    className
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={`relative group ${containerClassName}`}>
      {!hideIcon && (
        <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-orange-500 transition-colors group-focus-within:text-orange-600" />
      )}
      <input
        type="date"
        {...props}
        className={inputClassName}
      />
    </div>
  );
}

