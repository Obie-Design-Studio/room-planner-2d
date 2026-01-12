export const FURNITURE_THEME = {
  // Stroke colors
  stroke: {
    primary: '#333333',      // Main outlines
    secondary: '#666666',    // Detail lines
    accent: '#999999',       // Subtle features
  },
  
  // Fill colors
  fill: {
    primary: '#FFFFFF',      // Main furniture body
    secondary: '#F5F5F5',    // Secondary surfaces
    accent: '#E0E0E0',       // Highlights/cushions
  },
  
  // Stroke widths (in pixels, will scale with zoom)
  strokeWidth: {
    primary: 2,              // Main outlines
    secondary: 1,            // Detail lines
    thin: 0.5,               // Very fine details
  },
  
  // Door specific
  door: {
    panelStroke: '#333333',
    arcStroke: '#999999',
    arcDash: [5, 5],
  }
};
