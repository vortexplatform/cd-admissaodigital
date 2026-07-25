import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  showWordmark?: boolean;
  variant?: 'default' | 'light';
}

export const Logo = ({
  className,
  showWordmark = true,
  variant = 'default',
}: LogoProps) => {
  const isLight = variant === 'light';
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span
        className={cn(
          'relative inline-flex h-8 w-8 items-center justify-center rounded-lg',
          isLight
            ? 'bg-white/10 ring-1 ring-white/20'
            : 'bg-blue-900/15 ring-1 ring-blue-800/25 dark:bg-blue-400/15 dark:ring-blue-400/25',
        )}
        aria-hidden
      >
        <span
          className={cn(
            'block h-3.5 w-3.5 rounded-sm',
            isLight ? 'bg-white' : 'bg-blue-800 dark:bg-blue-400',
          )}
        />
        <span
          className={cn(
            'absolute -right-0.5 -top-0.5 block h-2.5 w-2.5 rounded-sm',
            isLight ? 'bg-white/70' : 'bg-blue-600/50 dark:bg-blue-300/50',
          )}
        />
      </span>
      {showWordmark && (
        <span
          className={cn(
            'text-base font-bold tracking-tight',
            isLight ? 'text-white' : 'text-foreground',
          )}
        >
          Admissão<span className={isLight ? 'text-white/70' : 'text-blue-700 dark:text-blue-400'}>Digital</span>
        </span>
      )}
    </div>
  );
};
