export default function Input({
  label,
  type = 'text',
  placeholder,
  error,
  register,
  name,
  ...props
}) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-sm font-medium text-gray-700">{label}</label>
      )}
      <input
        type={type}
        placeholder={placeholder}
        {...(register ? register(name) : {})}
        {...props}
        className={`w-full px-3 py-2.5 text-sm border rounded-lg outline-none transition-all
          focus:ring-2 focus:ring-blue-500 focus:border-transparent
          ${error ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white'}
        `}
      />
      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}
    </div>
  )
}