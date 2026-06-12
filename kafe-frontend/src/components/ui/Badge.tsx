import React from 'react';

type Color = 'yellow' | 'blue' | 'orange' | 'green' | 'gray' | 'red';

const colorClasses: Record<Color, string> = {
  yellow: 'bg-yellow-100 text-yellow-800',
  blue:   'bg-blue-100   text-blue-800',
  orange: 'bg-orange-100 text-orange-800',
  green:  'bg-green-100  text-green-800',
  gray:   'bg-gray-100   text-gray-800',
  red:    'bg-red-100    text-red-800',
};

interface BadgeProps {
  color?: Color;
  children: React.ReactNode;
  className?: string;
}

export default function Badge({ color = 'gray', children, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClasses[color]} ${className}`}
    >
      {children}
    </span>
  );
}
