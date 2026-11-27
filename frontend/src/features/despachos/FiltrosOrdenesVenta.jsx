import FilterBar from '../../components/ui/FilterBar'
import SelectField from '../../components/ui/SelectField'
import ComboboxField from '../../components/ui/ComboboxField'
import DateField from '../../components/ui/DateField'

/**
 * Filtros de la pestaña "Órdenes de venta a despachar".
 * Producto va al servidor (con debounce); cliente, subsidiaria y fechas se filtran en el front.
 * Producto y Cliente son selects con búsqueda (ComboboxField).
 */
export default function FiltrosOrdenesVenta({ value, onChange, productos = [], clientes = [], subsidiarias = [], ordenes = [] }) {
  const set = (key) => (v) => onChange({ ...value, [key]: v })
  return (
    <FilterBar title="Filtros">
      <ComboboxField label="Producto" options={productos} value={value.producto} onChange={set('producto')} />
      <DateField label="Fecha OV desde" value={value.desde} onChange={set('desde')} />
      <DateField label="Fecha OV hasta" value={value.hasta} onChange={set('hasta')} />
      <ComboboxField label="Cliente" options={clientes} value={value.cliente} onChange={set('cliente')} />
      <ComboboxField label="Orden de venta" placeholder="- Todas -" options={ordenes} value={value.ordenVenta} onChange={set('ordenVenta')} />
      <SelectField label="Subsidiaria" placeholder="- Todas -" options={subsidiarias} value={value.subsidiaria} onChange={set('subsidiaria')} />
    </FilterBar>
  )
}
