const Button = ({
  children,
  type = 'button',
  variant = 'primary',
  disabled = false,
  className = '',
  ...props
}) => {
  const baseClasses =
    'inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60';

  const variants = {
    primary:
      'bg-slate-950 text-white hover:bg-slate-800 focus:ring-slate-900',
    secondary:
      'bg-white text-slate-900 border border-slate-200 hover:bg-slate-50 focus:ring-slate-300',
    accent:
      'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500',
    success:
      'bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-500',
    danger:
      'bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-500'
  };

  return (
    <button
      type={type}
      disabled={disabled}
      className={`${baseClasses} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;