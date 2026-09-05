import type { MoodKey } from './types';

export const colors = {
  background: '#F7F1EA',
  card: '#FFFFFF',
  textPrimary: '#25212B',
  textSecondary: '#766E7D',
  purple: '#7C5CFF',
  purpleSoft: '#E8DFFF',
  green: '#88BFA3',
  alert: '#D87C70',
};

export const moodColors: Record<MoodKey, string> = {
  tranquilo: '#88BFA3',
  neutro: '#E8DFFF',
  sobrecarregado: '#E3B341',
  triste: '#7C9CD8',
  ansioso: '#E39A63',
  animado: '#7C5CFF',
};

export const moodLabels: Record<MoodKey, string> = {
  tranquilo: 'Tranquilo',
  neutro: 'Neutro',
  sobrecarregado: 'Levemente sobrecarregado',
  triste: 'Triste',
  ansioso: 'Ansioso',
  animado: 'Animado',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const radii = {
  card: 20,
  button: 999,
};
