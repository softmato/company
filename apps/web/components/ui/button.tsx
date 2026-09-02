import { cn } from '@/lib/cn';

/**
 * The one button (docs/handoff/UI_HANDOFF.md §4).
 *
 * `h-9` / `rounded-md` / text-sm — shadcn's anatomy with our tokens on it.
 * `touch` is the 48px variant, used in checkout and anywhere a thumb is the
 * pointing device.
 *
 * `destructive` is for buttons that destroy. It is not `--flag`, which colours
 * figures; keeping them apart is what stops a red number reading as a red
 * button and the other way round.
 */
export type ButtonVariant =
  'primary' | 'secondary' | 'ghost' | 'destructive' | 'link';

export type ButtonSize = 'sm' | 'default' | 'touch';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-primary-foreground hover:bg-primary-hover',
  secondary: 'bg-surface text-foreground border border-border hover:bg-muted',
  ghost: 'text-foreground hover:bg-muted',
  destructive: 'bg-destructive text-destructive-foreground hover:opacity-90',
  link: 'text-primary underline underline-offset-4 hover:opacity-80',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 px-2.5 text-[13px] rounded-md',
  default: 'h-9 px-3.5 text-sm rounded-md',
  touch: 'h-12 px-5 text-[15px] rounded-md',
};

export function buttonClasses(
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'default',
  className?: string,
): string {
  return cn(
    'inline-flex items-center justify-center gap-2 font-medium',
    'transition-[background-color,opacity] duration-150 ease-out',
    'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
    'disabled:pointer-events-none disabled:opacity-50',
    '[&_svg]:size-4 [&_svg]:shrink-0',
    SIZES[size],
    VARIANTS[variant],
    className,
  );
}

export function Button({
  variant = 'primary',
  size = 'default',
  className,
  type = 'button',
  ...props
}: React.ComponentProps<'button'> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return (
    <button
      type={type}
      className={buttonClasses(variant, size, className)}
      {...props}
    />
  );
}
