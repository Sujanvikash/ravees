/**
 * Icon-only button. `label` is required: it is what screen readers announce.
 *
 * variant  close   grey icon that turns white (close/dismiss)
 *          remove  grey icon with a red hover wash (remove an item from a list)
 *          delete  small bordered button that turns red (admin delete)
 * Padding is left to the caller (className), since it depends on the icon size around it.
 */
const BASE =
  'inline-flex cursor-pointer items-center justify-center bg-transparent text-text-muted transition-all';

const VARIANTS = {
  close: 'border-none hover:text-white',
  remove: 'rounded-lg border-none hover:bg-[rgba(255,92,92,0.15)] hover:text-[#ff5c5c]',
  delete: 'rounded-lg border border-white/10 p-1.5 hover:border-ruby-500 hover:text-ruby-500',
};

const IconButton = ({ label, variant = 'close', type = 'button', className = '', children, ...rest }) => {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={`${BASE} ${VARIANTS[variant] ?? VARIANTS.close} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
};

export default IconButton;
