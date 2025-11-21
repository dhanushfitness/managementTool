import { TimePicker } from '@mui/x-date-pickers/TimePicker'
import dayjs from 'dayjs'

export default function TimeInput({
  value,
  onChange,
  className = '',
  containerClassName = '',
  required,
  disabled,
  ...props
}) {
  // Convert value from string (HH:mm) to dayjs object
  const dayjsValue = value && dayjs(value, 'HH:mm').isValid() ? dayjs(value, 'HH:mm') : null

  // Handle change event
  const handleChange = (newValue) => {
    if (onChange) {
      // Convert dayjs object back to string format (HH:mm) for native input compatibility
      const event = {
        target: {
          value: newValue && dayjs(newValue).isValid() ? newValue.format('HH:mm') : '',
        },
      }
      onChange(event)
    }
  }

  return (
    <div className={containerClassName}>
      <TimePicker
        value={dayjsValue}
        onChange={handleChange}
        format="HH:mm"
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

