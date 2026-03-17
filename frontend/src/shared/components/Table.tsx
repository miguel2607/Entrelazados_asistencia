import type { ReactNode } from 'react';

interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => ReactNode;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string | number;
}

export function Table<T>({ columns, data, keyExtractor }: TableProps<T>) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-[#e2e8f0] bg-white animate-scale-in">
      <table className="min-w-full divide-y divide-[#e2e8f0]">
        <thead className="bg-[#fcfaff]">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-6 py-4 text-left text-[10px] font-extrabold uppercase tracking-widest text-[#4b5563]"
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#f1f3f4] bg-white">
          {data.map((item, idx) => (
            <tr
              key={keyExtractor(item)}
              className={`transition-all duration-300 hover:bg-purple-50/50 group animate-fade-in stagger-${(idx % 5) + 1}`}
            >
              {columns.map((col) => (
                <td key={col.key} className="whitespace-nowrap px-6 py-4 text-sm font-medium text-[#111827] group-hover:text-[#2d1b69] transition-colors">
                  {col.render
                    ? col.render(item)
                    : ((item as Record<string, unknown>)[col.key] as ReactNode)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

