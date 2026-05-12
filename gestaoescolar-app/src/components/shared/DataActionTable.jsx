import { Inbox } from 'lucide-react'
import Button from '../ui/Button'
import { EmptyState, Spinner } from '../ui/Card'

function getCellValue(row, column, rowIndex) {
  if (column.render) return column.render(row, rowIndex)
  if (!column.key) return null
  return row?.[column.key] ?? '—'
}

function getRowKey(row, rowIndex, rowKey) {
  if (typeof rowKey === 'function') return rowKey(row, rowIndex)
  return row?.[rowKey] ?? row?.id ?? rowIndex
}

function alignClass(align) {
  const classes = {
    center: 'text-center',
    right: 'text-right',
  }
  return classes[align] ?? 'text-left'
}

function ActionButton({ action, row, rowIndex }) {
  const Icon = action.icon
  const disabled = typeof action.disabled === 'function' ? action.disabled(row, rowIndex) : action.disabled
  const title = action.title ?? action.label

  return (
    <Button
      type="button"
      variante={action.variante ?? action.variant ?? 'ghost'}
      tamanho="sm"
      icon={Icon}
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation()
        action.onClick?.(row, rowIndex, event)
      }}
      className={action.className ?? ''}
    >
      {action.showLabel ? action.label : null}
    </Button>
  )
}

function ActionsCell({ actions, row, rowIndex }) {
  if (!actions) return null

  if (typeof actions === 'function') {
    return <div className="flex items-center justify-end gap-1.5">{actions(row, rowIndex)}</div>
  }

  return (
    <div className="flex items-center justify-end gap-1.5">
      {actions.map((action) => (
        <ActionButton key={action.key ?? action.label} action={action} row={row} rowIndex={rowIndex} />
      ))}
    </div>
  )
}

export default function DataActionTable({
  columns = [],
  rows = [],
  rowKey = 'id',
  actions,
  loading = false,
  emptyTitle = 'Nenhum registro encontrado',
  emptyDescription,
  emptyIcon = Inbox,
  footer,
  onRowClick,
  minWidth = '720px',
  className = '',
  tableClassName = '',
}) {
  const hasActions = Boolean(actions)
  const colSpan = columns.length + (hasActions ? 1 : 0)

  return (
    <div className={`w-full overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm shadow-slate-200/40 ${className}`}>
      <div className="overflow-x-auto">
        <table className={`w-full text-sm ${tableClassName}`} style={{ minWidth }}>
          <thead className="bg-slate-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key ?? column.header}
                  scope="col"
                  className={`
                    whitespace-nowrap border-b border-slate-100 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500
                    ${alignClass(column.align)}
                    ${column.headerClassName ?? ''}
                  `}
                  style={column.width ? { width: column.width } : undefined}
                >
                  {column.header}
                </th>
              ))}
              {hasActions && (
                <th className="whitespace-nowrap border-b border-slate-100 px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Ações
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {loading && (
              <tr>
                <td colSpan={colSpan} className="px-4 py-12">
                  <div className="flex items-center justify-center">
                    <Spinner />
                  </div>
                </td>
              </tr>
            )}

            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={colSpan}>
                  <EmptyState icon={emptyIcon} titulo={emptyTitle} descricao={emptyDescription} />
                </td>
              </tr>
            )}

            {!loading && rows.map((row, rowIndex) => (
              <tr
                key={getRowKey(row, rowIndex, rowKey)}
                onClick={onRowClick ? () => onRowClick(row, rowIndex) : undefined}
                className={`
                  transition-colors duration-150
                  ${onRowClick ? 'cursor-pointer hover:bg-slate-50' : 'hover:bg-slate-50/70'}
                `}
              >
                {columns.map((column) => (
                  <td
                    key={column.key ?? column.header}
                    className={`
                      px-4 py-3 align-middle text-slate-700
                      ${column.nowrap === false ? '' : 'whitespace-nowrap'}
                      ${alignClass(column.align)}
                      ${column.cellClassName ?? ''}
                    `}
                  >
                    {getCellValue(row, column, rowIndex)}
                  </td>
                ))}
                {hasActions && (
                  <td className="whitespace-nowrap px-4 py-3 text-right align-middle">
                    <ActionsCell actions={actions} row={row} rowIndex={rowIndex} />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {footer && <div className="border-t border-slate-100 px-4 py-3">{footer}</div>}
    </div>
  )
}
