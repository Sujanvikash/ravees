import Chip from './Chip.jsx';

const CategoryTabs = ({ categories, selected, onSelect }) => {
  return (
    // The row scrolls sideways on narrow screens, with no scrollbar under it.
    <div className="mb-5 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {categories.map((cat) => {
        const active = selected === cat.id;
        return (
          <Chip
            key={cat.id}
            size="md"
            glow
            active={active}
            onClick={() => onSelect(cat.id)}
            className={`whitespace-nowrap duration-300 ${active ? '' : 'font-medium'}`}
          >
            <span className="mr-1">{cat.icon}</span> {cat.name} ({cat.count})
          </Chip>
        );
      })}
    </div>
  );
};

export default CategoryTabs;
