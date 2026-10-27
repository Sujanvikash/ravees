import logo from '../assets/logo.svg';
import logoMark from '../assets/logo-mark.svg';

/**
 * The brand logo, the same artwork the billing app prints (src/assets/logo.svg, also served as /logo.svg):
 * "Raave's" in red over the green EVERGREEN band, "Christmas Tree & Decoration" and "Since 1997".
 * Its colours are the brand's own and never follow the theme. The lower lines have no background of
 * their own, so the full logo always sits on a white plate, like the shop sign.
 *
 * mark    the red R on its white tile (src/assets/logo-mark.svg, also the favicon), for small places
 *         where the full logo can't be read
 * height  the full logo's height (plate included), or the mark's width and height, in px
 */
const Logo = ({ mark = false, height = 44, className = '' }) => {
  if (mark) {
    return (
      <img src={logoMark} alt="" aria-hidden="true" width={height} height={height} className={`block ${className}`.trim()} />
    );
  }

  return (
    // The plate's padding grows with the logo, so the margin round the artwork looks the same at every size.
    <span
      style={{ height, padding: `${Math.round(height * 0.09)}px ${Math.round(height * 0.14)}px` }}
      className={`inline-flex shrink-0 items-center rounded-md bg-white shadow-[0_2px_10px_rgb(0_0_0/0.3)] ${className}`.trim()}
    >
      <img src={logo} alt="Raave's Evergreen, Christmas Tree & Decoration, since 1997" className="block h-full w-auto" />
    </span>
  );
};

export default Logo;
