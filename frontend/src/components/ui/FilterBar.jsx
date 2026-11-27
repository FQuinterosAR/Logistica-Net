import Section from './Section'
import FieldGrid from './FieldGrid'

export default function FilterBar({ title = 'Filtros', defaultOpen = true, children }) {
  return (
    <Section title={title} defaultOpen={defaultOpen}>
      <FieldGrid cols="auto">{children}</FieldGrid>
    </Section>
  )
}
