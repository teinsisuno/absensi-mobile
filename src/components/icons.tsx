import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

interface IconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

function makePaths(children: React.ReactNode) {
  return function Icon({ size = 24, color = 'currentColor', strokeWidth = 2 }: IconProps) {
    return (
      <Svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth={strokeWidth}>
        {children}
      </Svg>
    );
  };
}

// Ikon stroke-style, path sama persis dengan SVG di PWA (MobileNav / MenuCard / clock)
export const HomeIcon = makePaths(
  <>
    <Path d="M3 10.5L12 3l9 7.5" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M5 9.5V21h5v-6h4v6h5V9.5" strokeLinecap="round" strokeLinejoin="round" />
  </>
);

export const CalendarIcon = makePaths(
  <>
    <Rect x={3} y={5} width={18} height={16} rx={2} />
    <Path d="M8 3v4M16 3v4M3 10h18" />
  </>
);

export const FingerprintIcon = makePaths(
  <>
    <Path d="M12 11a3 3 0 0 1 3 3c0 2.5-.8 5-2 7M9.3 6.6A6 6 0 0 1 18 14M6.5 14a5.5 5.5 0 0 0 .5 2M4.6 10.3A8 8 0 0 1 12 4" strokeLinecap="round" />
    <Path d="M12 14a2.5 2.5 0 0 0 .5 5" strokeLinecap="round" />
  </>
);

export const ScheduleIcon = makePaths(
  <>
    <Rect x={3} y={4} width={18} height={18} rx={2} />
    <Path d="M16 2v4M8 2v4M3 10h18" />
    <Path d="M9 15l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
  </>
);

export const UserIcon = makePaths(
  <>
    <Circle cx={12} cy={8} r={4} />
    <Path d="M4 21a8 8 0 0 1 16 0" />
  </>
);

export const ClockCircleIcon = makePaths(
  <>
    <Circle cx={12} cy={12} r={9} />
    <Path d="M12 7v5l3 3" strokeLinecap="round" strokeLinejoin="round" />
  </>
);

export const FileIcon = makePaths(
  <>
    <Path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5z" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M14 3v5h5M9 13h6M9 17h4" strokeLinecap="round" strokeLinejoin="round" />
  </>
);

export const MapPinIcon = makePaths(
  <>
    <Path d="M12 21s-7-5.5-7-11a7 7 0 0 1 14 0c0 5.5-7 11-7 11z" strokeLinecap="round" strokeLinejoin="round" />
    <Circle cx={12} cy={10} r={2.5} />
  </>
);

export const TasksIcon = makePaths(
  <>
    <Rect x={4} y={4} width={16} height={16} rx={2} />
    <Path d="M9 9l2 2 4-4M9 15l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
  </>
);

export const BackIcon = makePaths(
  <Path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
);

export const CheckIcon = makePaths(
  <Path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
);

export const MegaphoneIcon = makePaths(
  <Path d="M3 11l18-7-7 18-2.5-7.5L3 11z" strokeLinecap="round" strokeLinejoin="round" />
);

export const LogoutIcon = makePaths(
  <>
    <Path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
    <Circle cx={10} cy={7} r={4} />
    <Path d="M21 11l-3-3m0 0l-3 3m3-3v8" strokeLinecap="round" strokeLinejoin="round" />
  </>
);

export const ChevronRightIcon = makePaths(
  <Path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
);
