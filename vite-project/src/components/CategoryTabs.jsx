import Chip from './Chip.jsx';

const CategoryTabs = ({ categories, selected, onSelect }) => {
  return (
    <div className="mb-9 flex gap-2.5 overflow-x-auto pb-2">
      {categories.map((cat) => {
        const active = selected === cat.id;
        return (
          <Chip
            key={cat.id}
            size="lg"
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
