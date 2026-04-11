interface BadgeProps {
  variant: 'scheduled' | 'sent' | 'failed';
  children: React.ReactNode;
}

export default function Badge({ variant, children }: BadgeProps) {
  const styles = {
    scheduled: 'bg-orange-100 text-orange-600',
    sent: 'bg-gray-100 text-gray-600',
    failed: 'bg-red-100 text-red-600',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${styles[variant]}`}
    >
      {variant === 'scheduled' && (
        <span className="w-1.5 h-1.5 rounded-full bg-orange-500 flex-shrink-0" />
      )}
      {variant === 'sent' && (
        <span className="w-1.5 h-1.5 rounded-full bg-gray-500 flex-shrink-0" />
      )}
      {variant === 'failed' && (
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
      )}
      {children}
    </span>
  );
}
