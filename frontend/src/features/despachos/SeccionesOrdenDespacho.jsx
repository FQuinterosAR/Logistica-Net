import Section from '../../components/ui/Section'
import FieldGrid from '../../components/ui/FieldGrid'
import DateField from '../../components/ui/DateField'
import TextField from '../../components/ui/TextField'
import TextAreaField from '../../components/ui/TextAreaField'
import SelectField from '../../components/ui/SelectField'

/*
 * Secciones del formulario de orden de despacho.
 * Se usan en el modal de creación (editables, abiertas) y en el detalle de un despacho
 * (solo lectura hasta "Editar", compactas y cerradas).
 */

/** responsable: nombre a mostrar (siempre solo lectura; lo pone el servidor con el usuario actual). */
export function InfoGeneralSection({ form, onFieldChange, ubicaciones = [], responsable = '', readOnly = false, compact = false, defaultOpen = true }) {
  const set = (campo) => (valor) => onFieldChange(campo, valor)
  return (
    <Section title="Información general" headingLevel={3} compact={compact} defaultOpen={defaultOpen}>
      <FieldGrid cols={4}>
        <DateField label="Fecha" required={!readOnly} readOnly={readOnly} value={form.fecha} onChange={set('fecha')} />
        <TextField label="Nota" readOnly={readOnly} value={form.nota} onChange={set('nota')} />
        <SelectField
          label="Ubicación"
          required={!readOnly}
          readOnly={readOnly}
          placeholder="<Seleccionar>"
          options={ubicaciones}
          value={form.ubicacion}
          onChange={set('ubicacion')}
        />
        {/* El responsable nunca se edita: siempre como texto. */}
        <TextField label="Responsable despacho" readOnly value={responsable ?? ''} />
      </FieldGrid>
    </Section>
  )
}

/**
 * Transportes, valor declarado y dirección de entrega. Al crear vienen precargados desde el cliente de la OV
 * (transportista inicial/final y dirección de envío por defecto) y se pueden editar.
 * transportistas: opciones de transporte inicial/final ([{ value: id de ShipItem, label: displayName }]).
 */
export function DatosTransporteSection({ form, onFieldChange, transportistas = [], readOnly = false, compact = false, defaultOpen = true }) {
  const set = (campo) => (valor) => onFieldChange(campo, valor)
  const transporte = (label, nombre) => (
    <SelectField
      label={label}
      readOnly={readOnly}
      placeholder="<Seleccionar>"
      options={transportistas}
      value={form[nombre]}
      onChange={set(nombre)}
    />
  )
  return (
    <Section title="Datos transporte" headingLevel={3} compact={compact} defaultOpen={defaultOpen}>
      <FieldGrid cols={3}>
        {transporte('Transporte inicial', 'transporteInicial')}
        {transporte('Transporte final', 'transporteFinal')}
        <TextField
          label="Valor declarado"
          type="number"
          min="0"
          step="0.01"
          readOnly={readOnly}
          value={form.valorDeclarado}
          onChange={set('valorDeclarado')}
        />
        <div className="col-span-full">
          <TextAreaField label="Dirección cliente" rows={3} readOnly={readOnly} value={form.direccion} onChange={set('direccion')} />
        </div>
      </FieldGrid>
    </Section>
  )
}
