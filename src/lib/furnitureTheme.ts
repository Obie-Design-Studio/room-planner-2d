export const FURNITURE_THEME = {
  // Stroke colors
  stroke: {
    primary: '#000000',      // Main outlines - pure black for maximum contrast
    secondary: '#222222',    // Detail lines - very dark gray
    accent: '#444444',       // Subtle features - dark gray
  },
  
  // Fill colors
  fill: {
    primary: '#FFFFFF',      // Main furniture body
    secondary: '#E8E8E8',    // Secondary surfaces - darker
    accent: '#C0C0C0',       // Highlights/cushions - darker for visibility
  },
  
  // Stroke widths (in pixels, will scale with zoom)
  strokeWidth: {
    primary: 4,              // Main outlines - extra thick for small icons
    secondary: 2.5,          // Detail lines - thicker
    thin: 1.5,               // Very fine details - thicker
  },
  
  // Door specific
  door: {
    panelStroke: '#333333',
    arcStroke: '#999999',
    arcDash: [5, 5],
  }
};
