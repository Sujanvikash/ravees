/**
 * The header row of every admin page: title and subtitle on the left, actions on the right.
 *
 * Props
 *  title       the page title
 *  subtitle    a line under it (counts, a description)
 *  before      something above the title (e.g. a "Back to products" link)
 *  actions     the page's own buttons (e.g. "New product")
 */
const AdminPageHeader = ({ title, subtitle, before, actions }) => (
  <div className="flex flex-wrap items-center justify-between gap-4">
    <div>
      {before}
      <h1 className="font-serif text-[1.6rem] font-bold tracking-[0.03em] text-text-primary">{title}</h1>
      {subtitle && <p className="mt-1 text-[0.85rem] text-text-secondary">{subtitle}</p>}
    </div>
    {actions && <div className="flex flex-wrap gap-2.5">{actions}</div>}
  </div>
);

export default AdminPageHeader;
