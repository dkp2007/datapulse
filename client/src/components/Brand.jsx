

export const BRAND = {
  name: 'DataPulse',
  tagline: 'See what your business is doing',
};

export function Logo({ size = 28, className = '' }) {
  return (
    <img
      src="/logo-512.png"
      alt="DataPulse logo"
      width={size}
      height={size}
      className={`rounded-lg ${className}`}
    />
  );
}

export function BrandMark({ size = 28, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <Logo size={size} />
      <span className="font-bold text-brand-800">{BRAND.name}</span>
    </span>
  );
}
