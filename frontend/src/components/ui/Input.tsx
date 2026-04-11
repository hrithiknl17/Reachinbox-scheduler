interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export default function Input({ className = '', ...props }: InputProps) {
  return (
    <input
      className={`w-full border border-gray-200 rounded-lg px-4 py-3 text-sm outline-none focus:border-green-400 focus:ring-1 focus:ring-green-400 bg-gray-50 placeholder-gray-400 transition-colors ${className}`}
      {...props}
    />
  );
}
