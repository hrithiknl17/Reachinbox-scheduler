'use client';

interface HeaderProps {
  title?: string;
  onSearch?: (query: string) => void;
}

export default function Header({ title, onSearch }: HeaderProps) {
  return (
    <div className="flex items-center gap-2 p-4 border-b border-gray-100">
      {title && <h2 className="text-base font-semibold text-gray-800 mr-4">{title}</h2>}
      <input
        type="text"
        placeholder="Search"
        onChange={(e) => onSearch?.(e.target.value)}
        className="flex-1 px-4 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-green-400 focus:ring-1 focus:ring-green-400"
      />
    </div>
  );
}
