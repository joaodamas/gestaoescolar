export function Input({ label, hint, error, icon: Icon, className = '', ...props }) {
  return (
    <div className={className}>
      {label && (
        <label className="block text-xs font-semibold text-slate-700 mb-1.5 tracking-wide uppercase">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <Icon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        )}
        <input
          {...props}
          className={`
            w-full h-10 px-3 text-sm rounded-lg
            bg-white border border-slate-200
            placeholder:text-slate-400
            focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500
            disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed
            transition-all duration-150
            ${Icon ? 'pl-9' : ''}
            ${error ? 'border-red-300 focus:ring-red-500/30 focus:border-red-500' : ''}
          `}
        />
      </div>
      {hint && !error && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
      {error && <p className="text-xs text-red-600 mt-1 flex items-center gap-1">⚠ {error}</p>}
    </div>
  )
}

export function Select({ label, hint, error, children, className = '', ...props }) {
  return (
    <div className={className}>
      {label && (
        <label className="block text-xs font-semibold text-slate-700 mb-1.5 tracking-wide uppercase">
          {label}
        </label>
      )}
      <select
        {...props}
        className={`
          w-full h-10 px-3 pr-8 text-sm rounded-lg
          bg-white border border-slate-200
          focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500
          disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed
          transition-all duration-150 appearance-none cursor-pointer
          bg-[url("data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='12'%20height='12'%20viewBox='0%200%2024%2024'%20fill='none'%20stroke='%2364748b'%20stroke-width='2'%3E%3Cpath%20d='m6%209%206%206%206-6'/%3E%3C/svg%3E")] bg-no-repeat bg-[right_12px_center]
          ${error ? 'border-red-300' : ''}
        `}
      >
        {children}
      </select>
      {hint && !error && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  )
}

export function Textarea({ label, hint, error, className = '', ...props }) {
  return (
    <div className={className}>
      {label && (
        <label className="block text-xs font-semibold text-slate-700 mb-1.5 tracking-wide uppercase">
          {label}
        </label>
      )}
      <textarea
        {...props}
        className={`
          w-full px-3 py-2.5 text-sm rounded-lg
          bg-white border border-slate-200
          placeholder:text-slate-400
          focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500
          transition-all duration-150 resize-none
          ${error ? 'border-red-300' : ''}
        `}
      />
      {hint && !error && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  )
}
