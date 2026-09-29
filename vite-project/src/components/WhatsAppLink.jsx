import { FaWhatsapp } from 'react-icons/fa';
import { whatsappHref } from '../data/site.js';

export default function WhatsAppLink({ text, iconSize = 16, iconClassName = '', className = '', children, ...rest }) {
  return (
    <a href={whatsappHref(text)} target="_blank" rel="noreferrer" className={className} {...rest}>
      <FaWhatsapp size={iconSize} className={iconClassName} />
      {children}
    </a>
  );
}
