export type Unit = 'cm' | 'm' | 'in' | 'ft';

export const UNIT_LABELS: Record<Unit, string> = {
  cm: 'cm',
  m: 'm',
  in: 'in',
  ft: 'ft',
};

/**
 * Convert from centimeters to the target unit
 */
export function convertFromCm(cm: number, targetUnit: Unit): number {
  switch (targetUnit) {
    case 'cm':
      return cm;
    case 'm':
      return cm / 100;
    case 'in':
      return cm / 2.54;
    case 'ft':
      return cm / 30.48;
    default:
      return cm;
  }
}

/**
 * Format a measurement value with appropriate precision for the unit
 */
export function formatMeasurement(cm: number, unit: Unit): string {
  const value = convertFromCm(cm, unit);
  
  switch (unit) {
    case 'cm':
      return `${Math.round(value)}${UNIT_LABELS[unit]}`;
    case 'm':
      return `${value.toFixed(2)}${UNIT_LABELS[unit]}`;
    case 'in':
      return `${value.toFixed(1)}${UNIT_LABELS[unit]}`;
    case 'ft':
      return `${value.toFixed(2)}${UNIT_LABELS[unit]}`;
    default:
      return `${Math.round(value)}${UNIT_LABELS[unit]}`;
  }
}

/**
 * Format dimensions (width x height)
 */
export function formatDimensions(widthCm: number, heightCm: number, unit: Unit): string {
  const width = convertFromCm(widthCm, unit);
  const height = convertFromCm(heightCm, unit);
  
  switch (unit) {
    case 'cm':
      return `${Math.round(width)}${UNIT_LABELS[unit]} × ${Math.round(height)}${UNIT_LABELS[unit]}`;
    case 'm':
      return `${width.toFixed(2)}${UNIT_LABELS[unit]} × ${height.toFixed(2)}${UNIT_LABELS[unit]}`;
    case 'in':
      return `${width.toFixed(1)}${UNIT_LABELS[unit]} × ${height.toFixed(1)}${UNIT_LABELS[unit]}`;
    case 'ft':
      return `${width.toFixed(2)}${UNIT_LABELS[unit]} × ${height.toFixed(2)}${UNIT_LABELS[unit]}`;
    default:
      return `${Math.round(width)}${UNIT_LABELS[unit]} × ${Math.round(height)}${UNIT_LABELS[unit]}`;
  }
}
