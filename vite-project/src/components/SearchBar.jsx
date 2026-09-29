import { Search, X } from 'lucide-react';

/**
 * Icon + input + Enter-to-submit, with an optional close button. Deliberately has
 * no wrapping element of its own — the two call sites in Header.jsx (the desktop
 * dropdown and the mobile menu panel) each need a differently-styled container, so
 * that stays with the caller instead of being duplicated inside this component too.
 */
export default function SearchBar({
  value,
  onChange,
  onSubmit,
  onClose,
  placeholder = 'Search products...',
  autoFocus = false,
  iconSize = 18,
  inputClassName = 'text-[0.9rem]',
}) {
  return (
    <>
      <Search size={iconSize} strokeWidth={2} className="shrink-0 text-gold-400" />
      <input
        type="text"
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && onSubmit?.()}
        placeholder={placeholder}
        className={`min-w-0 flex-1 border-none bg-transparent font-sans text-white outline-none placeholder:text-text-muted ${inputClassName}`}
      />
      {onClose && (
        <button
          type="button"
          className="cursor-pointer border-none bg-transparent text-text-muted transition-colors hover:text-white"
          onClick={onClose}
          aria-label="Close search"
        >
          <X size={24} />
        </button>
      )}
    </>
  );
}
