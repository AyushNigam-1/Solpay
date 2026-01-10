// import { TableHeaderProps } from '@/app/types/props'
import { TableHeaderProps } from '@/app/types'

const TableHeaders = ({ columns }: { columns: TableHeaderProps[] }) => {
    return (
        <thead className="text-sm text-body">
            <tr>
                {columns.map((column, index) => (
                    <th
                        key={column.title}
                        className={`
              px-6 py-4.5    font-bold text-lg bg-white/5 
              ${index === 0 ? "rounded-tl-2xl" : ""}
              ${index === columns.length - 1 ? "rounded-tr-2xl" : ""}
            `}
                    >
                        <div className="flex items-center gap-2">
                            {column.icon}
                            {column.title}
                        </div>
                    </th>
                ))}
            </tr>
        </thead>
    );
};

export default TableHeaders