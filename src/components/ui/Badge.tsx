interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'venus' | 'earth' | 'mars' | 'jupiter' | 'saturn' | 'uranus' | 'mercury';
}

// Lower border opacities — chips read as "tinted air" rather than outlined buttons.
const variantStyles: Record<string, string> = {
  default: 'bg-white/[0.05] text-white/70 border-white/[0.08] hover:bg-white/[0.10] hover:border-white/[0.18]',
  mercury: 'bg-[#8C8C8C]/[0.14] text-[#8C8C8C] border-[#8C8C8C]/[0.20] hover:bg-[#8C8C8C]/[0.22]',
  venus: 'bg-[#F0D080]/[0.13] text-[#F0D080] border-[#F0D080]/[0.20] hover:bg-[#F0D080]/[0.22]',
  earth: 'bg-[#5A8FB5]/[0.12] text-[#7BB1D2] border-[#5A8FB5]/[0.18] hover:bg-[#5A8FB5]/[0.20]',
  mars: 'bg-[#D05010]/[0.13] text-[#D05010] border-[#D05010]/[0.20] hover:bg-[#D05010]/[0.22]',
  jupiter: 'bg-[#E09030]/[0.13] text-[#E09030] border-[#E09030]/[0.20] hover:bg-[#E09030]/[0.22]',
  saturn: 'bg-[#E0B830]/[0.13] text-[#E0B830] border-[#E0B830]/[0.20] hover:bg-[#E0B830]/[0.22]',
  uranus: 'bg-[#60E0F0]/[0.13] text-[#60E0F0] border-[#60E0F0]/[0.20] hover:bg-[#60E0F0]/[0.22]',
};

export function Badge({ children, variant = 'default' }: BadgeProps) {
  return (
    <span
      className={`
        inline-block px-3.5 py-1.5 text-[11px] font-mono tracking-wider
        rounded-full border transition-all duration-200
        ${variantStyles[variant]}
      `}
    >
      {children}
    </span>
  );
}
