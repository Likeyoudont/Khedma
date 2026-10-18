function Button({ children, variant = 'primary', className = '', ...props }) {
  const variantClass = {
    primary: 'btn-primary',
    secondary: 'btn-outline-primary',
    danger: 'btn-danger',
    success: 'btn-success',
    light: 'btn-light',
  }[variant] || 'btn-primary'

  return (
    <button className={`btn ${variantClass} ${className}`.trim()} {...props}>
      {children}
    </button>
  )
}

export default Button
