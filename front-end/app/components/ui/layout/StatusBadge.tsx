import { CheckCircle2, XCircle } from "lucide-react";

export const StatusBadge = ({ active, label }: { active: boolean, label?: string }) => (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full  font-medium border ${active
        ? "bg-green-500/10 text-green-400 border-green-500/20"
        : "bg-gray-500/10 text-gray-400 border-gray-500/20"
        }`}>
        {active ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
        {label || (active ? "Active" : "Inactive")}
    </span>
);