import Select from 'react-select'

type SelectOption = {
  label: string
  value: string
}

export function FormSelect({
  value,
  options,
  onChange,
  placeholder = 'Selectionner...',
  isClearable = false,
}: {
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
  placeholder?: string
  isClearable?: boolean
}) {
  const selected = options.find((option) => option.value === value) ?? null

  return (
    <Select<SelectOption, false>
      classNamePrefix="crfc-select"
      value={selected}
      options={options}
      onChange={(option) => onChange(option?.value ?? '')}
      placeholder={placeholder}
      isClearable={isClearable}
      menuPortalTarget={typeof document === 'undefined' ? undefined : document.body}
      styles={{
        control: (base, state) => ({
          ...base,
          minHeight: 46,
          borderRadius: 14,
          borderColor: state.isFocused ? '#5b8fe8' : '#d1d5db',
          boxShadow: state.isFocused ? '0 0 0 3px rgba(59,111,212,0.12)' : 'none',
          backgroundColor: '#ffffff',
          paddingLeft: 4,
          cursor: 'pointer',
          '&:hover': {
            borderColor: '#5b8fe8',
          },
        }),
        valueContainer: (base) => ({
          ...base,
          padding: '2px 10px',
        }),
        input: (base) => ({
          ...base,
          margin: 0,
          padding: 0,
          color: '#111827',
        }),
        placeholder: (base) => ({
          ...base,
          color: '#9ca3af',
        }),
        singleValue: (base) => ({
          ...base,
          color: '#111827',
        }),
        indicatorSeparator: () => ({
          display: 'none',
        }),
        dropdownIndicator: (base, state) => ({
          ...base,
          color: state.isFocused ? '#1b3a6b' : '#6b7280',
          '&:hover': {
            color: '#1b3a6b',
          },
        }),
        clearIndicator: (base) => ({
          ...base,
          color: '#6b7280',
          '&:hover': {
            color: '#ef4444',
          },
        }),
        menuPortal: (base) => ({
          ...base,
          zIndex: 9999,
        }),
        menu: (base) => ({
          ...base,
          borderRadius: 16,
          overflow: 'hidden',
          border: '1px solid #e5e7eb',
          boxShadow: '0 20px 60px rgba(0,0,0,0.12)',
        }),
        menuList: (base) => ({
          ...base,
          padding: 8,
        }),
        option: (base, state) => ({
          ...base,
          borderRadius: 10,
          backgroundColor: state.isSelected
            ? '#1b3a6b'
            : state.isFocused
              ? '#eef4fd'
              : '#ffffff',
          color: state.isSelected ? '#ffffff' : '#111827',
          cursor: 'pointer',
          padding: '10px 12px',
        }),
      }}
    />
  )
}
