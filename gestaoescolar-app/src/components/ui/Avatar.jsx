function iniciais(nome) {
  if (!nome) return '?'
  return nome
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0])
    .join('')
    .toUpperCase()
}

const TAMANHOS = {
  sm: 'w-8 h-8 text-[11px] rounded-lg',
  md: 'w-9 h-9 text-xs rounded-lg',
  lg: 'w-14 h-14 text-sm rounded-xl',
  xl: 'w-20 h-20 text-lg rounded-2xl',
}

export default function Avatar({ nome, src, tamanho = 'md', className = '' }) {
  return (
    <div className={`${TAMANHOS[tamanho]} bg-gradient-to-br from-slate-700 to-slate-800 ring-1 ring-slate-600 flex items-center justify-center font-bold text-white shrink-0 overflow-hidden ${className}`}>
      {src ? (
        <img src={src} alt={nome ? `Foto de ${nome}` : 'Avatar'} className="w-full h-full object-cover" />
      ) : (
        iniciais(nome)
      )}
    </div>
  )
}
