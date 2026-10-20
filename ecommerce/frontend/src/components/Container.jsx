/** The site's page width: centered, max 1360px, 24px side gutter. */
const Container = ({ as: Tag = 'div', className = '', children, ...rest }) => {
  return (
    <Tag className={`mx-auto max-w-340 px-6 ${className}`} {...rest}>
      {children}
    </Tag>
  );
};

export default Container;
