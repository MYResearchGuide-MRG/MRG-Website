import { Select } from "radix-ui"
import { Check, ChevronDown } from "lucide-react"

export function AdminSelect({
  label,
  value,
  onChange,
  options,
  disabled = false,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: {
    value: string
    label: string
    description?: string
    disabled?: boolean
  }[]
  disabled?: boolean
}) {
  const selected = options.find((option) => option.value === value)
  return (
    <Select.Root
      value={value || "__all__"}
      onValueChange={(next) => onChange(next === "__all__" ? "" : next)}
      disabled={disabled}
    >
      <Select.Trigger
        className={
          selected?.description ? "ad-select ad-select-detailed" : "ad-select"
        }
        aria-label={label}
      >
        <Select.Value>
          <span className="ad-select-copy">
            <span>{selected?.label || "Choose an option"}</span>
            {selected?.description && <small>{selected.description}</small>}
          </span>
        </Select.Value>
        <Select.Icon>
          <ChevronDown size={15} />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content
          className="ad-select-menu"
          position="popper"
          sideOffset={6}
          collisionPadding={12}
        >
          <Select.Viewport>
            {options.map((option) => (
              <Select.Item
                className="ad-select-option"
                key={option.value}
                value={option.value || "__all__"}
                textValue={`${option.label} ${option.description || ""}`}
                disabled={option.disabled}
              >
                <Select.ItemText>
                  <span className="ad-select-copy">
                    <span>{option.label}</span>
                    {option.description && <small>{option.description}</small>}
                  </span>
                </Select.ItemText>
                <Select.ItemIndicator>
                  <Check size={14} />
                </Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  )
}
