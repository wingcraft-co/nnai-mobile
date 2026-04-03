import { Platform, Text, type TextProps } from 'react-native';

import { Fonts, ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { cn } from '@/lib/utils';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'title' | 'small' | 'smallBold' | 'subtitle' | 'link' | 'linkPrimary' | 'code';
  themeColor?: ThemeColor;
  className?: string;
};

const typeClassNameMap: Record<NonNullable<ThemedTextProps['type']>, string> = {
  default: 'text-base leading-6 font-medium',
  title: 'text-5xl leading-[52px] font-bold',
  small: 'text-sm leading-5 font-medium',
  smallBold: 'text-sm leading-5 font-bold',
  subtitle: 'text-[32px] leading-[44px] font-semibold',
  link: 'text-sm leading-[30px]',
  linkPrimary: 'text-sm leading-[30px] font-semibold',
  code: 'text-xs',
};

export function ThemedText({
  style,
  type = 'default',
  themeColor,
  className,
  ...rest
}: ThemedTextProps) {
  const theme = useTheme();

  return (
    <Text
      className={cn(typeClassNameMap[type], className)}
      style={[
        { color: theme[themeColor ?? 'text'] },
        type === 'linkPrimary' && { color: theme.accent },
        type === 'code' && {
          fontFamily: Fonts.mono,
          fontWeight: Platform.select({ android: '700' }) ?? '500',
        },
        style,
      ]}
      {...rest}
    />
  );
}
