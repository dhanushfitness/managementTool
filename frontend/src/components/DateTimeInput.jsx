import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker'
import dayjs from 'dayjs'

export default function DateTimeInput({
  value,
  onChange,
  className = '',
  containerClassName = '',
  required,
  disabled,
  ...props
}) {
  // Convert value from string/Date to dayjs object
  const dayjsValue = value && dayjs(value).isValid() ? dayjs(value) : null

  // Handle change event
  const handleChange = (newValue) => {
    if (onChange) {
      // Convert dayjs object back to ISO string for compatibility
      const event = {
        target: {
          value: newValue && dayjs(newValue).isValid() ? newValue.toISOString() : '',
        },
      }
      onChange(event)
    }
  }

  return (
    <div className={containerClassName}>
      <DateTimePicker
        value={dayjsValue}
        onChange={handleChange}
        disabled={disabled}
        slotProps={{
          textField: {
            fullWidth: true,
            size: 'small',
            className: className,
            required: required,
            ...props,
          },
        }}
      />
    </div>
  )
}

