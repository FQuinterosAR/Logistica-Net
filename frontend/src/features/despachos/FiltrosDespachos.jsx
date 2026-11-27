import FilterBar from '../../components/ui/FilterBar'
import SelectField from '../../components/ui/SelectField'
import ComboboxField from '../../components/ui/ComboboxField'

/** Filtros de la pestaña "Despachos" (todos se aplican en el front sobre la lista de getDespachos). Cliente y Ubicación con búsqueda. */
export default function FiltrosDespachos({ value, onChange, estadosRemito = [], usuarios = [], ubicaciones = [], clientes = [], ordenesVenta = [], subsidiarias = [] }) {
  const set = (key) => (v) => onChange({ ...value, [key]: v })
  return (
    <FilterBar title="Filtros">
      <SelectField label="Estado remito" options={estadosRemito} value={value.estadoRemito} onChange={set('estadoRemito')} />
      <ComboboxField label="Cliente" options={clientes} value={value.cliente} onChange={set('cliente')} />
      <ComboboxField label="Orden de venta" placeholder="- Todas -" options={ordenesVenta} value={value.ordenVenta} onChange={set('ordenVenta')} />
      <SelectField label="Subsidiaria" placeholder="- Todas -" options={subsidiarias} value={value.subsidiaria} onChange={set('subsidiaria')} />
      <ComboboxField label="Ubicación" placeholder="- Todas -" options={ubicaciones} value={value.ubicacion} onChange={set('ubicacion')} />
      <SelectField label="Usuario" options={usuarios} value={value.usuario} onChange={set('usuario')} />
    </FilterBar>
  )
}
