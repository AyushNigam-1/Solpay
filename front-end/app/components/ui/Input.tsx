import { SubscriptionFormState } from "@/app/types";

const InputGroup: React.FC<{
    label: string;
    name: string;
    value: string | number | undefined;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder: string;
    type?: string;
    disabled?: boolean;
}> = ({ label, name, value, onChange, placeholder, type = 'text', disabled }) => (
    <div className='w-full '>
        <label htmlFor={name} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {label}
        </label>
        <input
            id={name}
            name={name}
            type={type}
            step={type === 'number' ? 'any' : undefined}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            disabled={disabled}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm  dark:bg-gray-700 dark:text-gray-200 disabled:bg-gray-100 disabled:dark:bg-gray-600 transition"
        />
    </div>
);

export default InputGroup