import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'

// Extend dayjs with custom parse format plugin
dayjs.extend(customParseFormat)

export default function DateInput({
  value,
  onChange,
  className = '',
  containerClassName = '',
  hideIcon = false,
  required,
  disabled,
  name,
  ...props
}) {
  // Convert value from string (YYYY-MM-DD) to dayjs object
  const dayjsValue = value && dayjs(value).isValid() ? dayjs(value) : null

  // Handle change event
  const handleChange = (newValue) => {
    if (onChange) {
      // Convert dayjs object back to string format (YYYY-MM-DD) for backend compatibility
      // But display format will be DD-MM-YYYY
      const event = {
        target: {
          name: name || '',
          value: newValue && dayjs(newValue).isValid() ? newValue.format('YYYY-MM-DD') : '',
        },
      }
      onChange(event)
    }
  }

  return (
    <div className={containerClassName}>
      <DatePicker
        value={dayjsValue}
        onChange={handleChange}
        format="DD-MM-YYYY"
        disabled={disabled}
        slotProps={{
          textField: {
            fullWidth: true,
            size: 'small',
            className: className,
            required: required,
            name: name,
            placeholder: 'DD-MM-YYYY',
            ...props,
          },
          popper: {
            style: { zIndex: 10004 },
            placement: 'bottom-start',
          },
        }}
      />
    </div>
  )
}
