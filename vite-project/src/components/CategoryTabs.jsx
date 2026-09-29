export default function CategoryTabs({ categories, selected, onSelect }) {
  return (
    <div className="mb-9 flex gap-2.5 overflow-x-auto pb-2">
      {categories.map((cat) => {
        const active = selected === cat.id;
        return (
          <button
            key={cat.id}
            onClick={() => onSelect(cat.id)}
            className={`cursor-pointer whitespace-nowrap rounded-full border px-5 py-2.5 text-[0.85rem] transition-all duration-300 ${
              active
                ? 'border-gold-300 bg-gold-500 font-bold text-[#04120a] shadow-[0_0_16px_rgba(229,199,139,0.4)]'
                : 'border-gold-400/15 bg-[rgba(8,28,20,0.85)] font-medium text-text-secondary hover:border-gold-400 hover:text-white'
            }`}
          >
            <span className="mr-1">{cat.icon}</span> {cat.name} ({cat.count})
          </button>
        );
      })}
    </div>
  );
}
