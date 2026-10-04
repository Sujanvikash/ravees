/** The site's page width: centered, max 1360px, 24px side gutter. */
export default function Container({ as: Tag = 'div', className = '', children, ...rest }) {
  return (
    <Tag className={`mx-auto max-w-[1360px] px-6 ${className}`} {...rest}>
      {children}
    </Tag>
  );
}
