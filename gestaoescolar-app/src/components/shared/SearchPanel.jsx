import { Search, X } from 'lucide-react'
import Button from '../ui/Button'

const fieldBaseClass = `
  w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800
  placeholder:text-slate-400 transition-all duration-150
  focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500
  disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed
`

function FieldLabel({ children }) {
  if (!children) return null

  return (
    <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
      {children}
    </label>
  )
}

function FilterField({ filter }) {
  const {
    key,
    name,
    label,
    type = 'select',
    value,
    onChange,
    options = [],
    placeholder = 'Todos',
    className = '',
    inputProps = {},
  } = filter

  const fieldName = name ?? key
  const handleChange = (event) => onChange?.(event.target.value, event)

  return (
    <div className={`min-w-0 ${className}`}>
      <FieldLabel>{label}</FieldLabel>
      {type === 'input' ? (
        <input
          {...inputProps}
          name={fieldName}
          value={value ?? ''}
          onChange={handleChange}
          placeholder={placeholder}
          className={fieldBaseClass}
        />
      ) : (
        <select
          {...inputProps}
          name={fieldName}
          value={value ?? ''}
          onChange={handleChange}
          className={`${fieldBaseClass} pr-8 appearance-none cursor-pointer bg-[url("data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='12'%20height='12'%20viewBox='0%200%2024%2024'%20fill='none'%20stroke='%2364748b'%20stroke-width='2'%3E%3Cpath%20d='m6%209%206%206%206-6'/%3E%3C/svg%3E")] bg-no-repeat bg-[right_12px_center]`}
        >
          {placeholder !== null && <option value="">{placeholder}</option>}
          {options.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>
      )}
    </div>
  )
}

export default function SearchPanel({
  titulo,
  descricao,
  searchValue = '',
  onSearchChange,
  searchPlaceholder = 'Buscar',
  filters = [],
  actions,
  children,
  onClear,
  clearLabel = 'Limpar',
  className = '',
}) {
  const hasHeader = titulo || descricao || actions
  const hasFilters = filters.length > 0 || children
  const canClear = Boolean(onClear)

  return (
    <section className={`w-full rounded-2xl border border-slate-200/70 bg-white shadow-sm shadow-slate-200/40 ${className}`}>
      {hasHeader && (
        <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-5">
          {(titulo || descricao) && (
            <div className="min-w-0">
              {titulo && <h2 className="text-sm font-semibold text-slate-900">{titulo}</h2>}
              {descricao && <p className="mt-0.5 text-xs text-slate-600">{descricao}</p>}
            </div>
          )}
          {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}

      <div className="space-y-3 p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <div className="min-w-0 flex-1">
            <FieldLabel>Busca</FieldLabel>
            <div className="relative">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={searchValue}
                onChange={(event) => onSearchChange?.(event.target.value, event)}
                placeholder={searchPlaceholder}
                className={`${fieldBaseClass} pl-9`}
              />
            </div>
          </div>

          {canClear && (
            <Button
              type="button"
              variante="secondary"
              tamanho="md"
              icon={X}
              onClick={onClear}
              className="w-full sm:w-auto lg:mb-0"
            >
              {clearLabel}
            </Button>
          )}
        </div>

        {hasFilters && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {filters.map((filter) => (
              <FilterField key={filter.key ?? filter.name ?? filter.label} filter={filter} />
            ))}
            {children}
          </div>
        )}
      </div>
    </section>
  )
}
