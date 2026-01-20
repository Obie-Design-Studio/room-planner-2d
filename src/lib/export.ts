import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { RoomConfig, FurnitureItem } from '@/types';

// Helper function to trigger download with fallback
function downloadPDF(pdf: jsPDF, filename: string): boolean {
  try {
    console.log('[PDF Download] === DOWNLOAD ATTEMPT START ===');
    console.log('[PDF Download] Filename:', filename);
    console.log('[PDF Download] PDF object:', pdf);
    console.log('[PDF Download] Browser info:', {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      vendor: navigator.vendor,
    });
    
    // Get PDF size for debugging
    try {
      const blob = pdf.output('blob');
      console.log('[PDF Download] PDF blob size:', blob.size, 'bytes', '(', (blob.size / 1024).toFixed(2), 'KB)');
      console.log('[PDF Download] PDF blob type:', blob.type);
    } catch (e) {
      console.error('[PDF Download] Failed to get blob info:', e);
    }
    
    // Method 1: Try pdf.save() first (standard jsPDF method)
    console.log('[PDF Download] Attempting Method 1: pdf.save()');
    try {
      pdf.save(filename);
      console.log('[PDF Download] ✅ pdf.save() completed successfully');
      console.log('[PDF Download] === DOWNLOAD ATTEMPT END (SUCCESS via Method 1) ===');
      return true;
    } catch (saveError) {
      console.error('[PDF Download] ❌ pdf.save() failed:', saveError);
      console.error('[PDF Download] Error stack:', (saveError as Error).stack);
    }
    
    // Method 2: Create blob and trigger download via anchor
    console.log('[PDF Download] Attempting Method 2: Blob + anchor');
    try {
      const blob = pdf.output('blob');
      console.log('[PDF Download] Blob created:', blob.size, 'bytes');
      
      const url = URL.createObjectURL(blob);
      console.log('[PDF Download] Blob URL created:', url);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.style.display = 'none';
      
      console.log('[PDF Download] Anchor element created:', {
        href: link.href,
        download: link.download,
        display: link.style.display,
      });
      
      document.body.appendChild(link);
      console.log('[PDF Download] Anchor appended to body');
      
      link.click();
      console.log('[PDF Download] Anchor clicked');
      
      // Cleanup after a short delay
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        console.log('[PDF Download] Anchor removed and URL revoked');
      }, 250);
      
      console.log('[PDF Download] ✅ Blob download triggered successfully');
      console.log('[PDF Download] === DOWNLOAD ATTEMPT END (SUCCESS via Method 2) ===');
      return true;
    } catch (blobError) {
      console.error('[PDF Download] ❌ Blob download failed:', blobError);
      console.error('[PDF Download] Error stack:', (blobError as Error).stack);
    }
    
    // Method 3: Open in new window for manual save
    console.log('[PDF Download] Attempting Method 3: Open in new window');
    try {
      const blob = pdf.output('blob');
      const url = URL.createObjectURL(blob);
      const newWindow = window.open(url, '_blank');
      
      if (newWindow) {
        console.log('[PDF Download] ✅ Opened in new window for manual save');
        console.log('[PDF Download] === DOWNLOAD ATTEMPT END (SUCCESS via Method 3) ===');
        return true;
      } else {
        console.error('[PDF Download] ❌ window.open returned null (popup blocked?)');
      }
    } catch (windowError) {
      console.error('[PDF Download] ❌ window.open failed:', windowError);
      console.error('[PDF Download] Error stack:', (windowError as Error).stack);
    }
    
    console.log('[PDF Download] === DOWNLOAD ATTEMPT END (ALL METHODS FAILED) ===');
    return false;
  } catch (error) {
    console.error('[PDF Download] === CRITICAL ERROR IN DOWNLOAD FUNCTION ===');
    console.error('[PDF Download] Error:', error);
    console.error('[PDF Download] Error stack:', (error as Error).stack);
    console.log('[PDF Download] === DOWNLOAD ATTEMPT END (CRITICAL FAILURE) ===');
    return false;
  }
}

// Export room as JSON
export function exportAsJSON(
  roomName: string,
  roomType: string,
  roomConfig: RoomConfig,
  ceilingHeight: number,
  items: FurnitureItem[]
) {
  const data = {
    version: '1.0',
    exportDate: new Date().toISOString(),
    room: {
      name: roomName,
      type: roomType,
      dimensions: {
        width: roomConfig.width,
        height: roomConfig.height,
        ceilingHeight: ceilingHeight,
      },
    },
    items: items.map(item => ({
      id: item.id,
      type: item.type,
      position: { x: item.x, y: item.y },
      dimensions: { width: item.width, height: item.height },
      rotation: item.rotation,
      color: item.color,
    })),
  };

  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${roomName.replace(/\s+/g, '_')}_${Date.now()}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Export canvas as PNG (for screenshot of entire UI)
export async function exportAsPNG(
  canvasContainer: HTMLElement,
  roomName: string
): Promise<boolean> {
  try {
    const canvas = await html2canvas(canvasContainer, {
      backgroundColor: '#FAFAFA',
      scale: 2,
      logging: false,
    });

    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${roomName.replace(/\s+/g, '_')}_${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    });

    return true;
  } catch (error) {
    console.error('Error exporting PNG:', error);
    return false;
  }
}

// Export as PDF (Blueprint view) - uses Konva stage for clean room-only export
export async function exportBlueprintAsPDF(
  stageRef: any, // Konva Stage ref
  roomName: string,
  roomConfig: RoomConfig,
  ceilingHeight: number,
  items: FurnitureItem[] = []
): Promise<boolean> {
  try {
    console.log('[PDF Export Blueprint] Starting...');
    console.log('[PDF Export Blueprint] stageRef:', stageRef);
    console.log('[PDF Export Blueprint] stageRef?.current:', stageRef?.current);
    
    if (!stageRef?.current) {
      console.error('[PDF Export Blueprint] Stage ref not available');
      alert('Canvas not ready. Please try again.');
      return false;
    }

    const stage = stageRef.current;
    console.log('[PDF Export Blueprint] Stage object:', stage);
    console.log('[PDF Export Blueprint] Stage dimensions:', stage.width(), 'x', stage.height());
    
    // Calculate the bounding box of actual content (room + furniture + door swings)
    const PIXELS_PER_CM = 4;
    const WALL_THICKNESS_CM = 2.5;
    
    // Room bounds (accounting for wall thickness)
    let minX = -WALL_THICKNESS_CM;
    let minY = -WALL_THICKNESS_CM;
    let maxX = roomConfig.width + WALL_THICKNESS_CM;
    let maxY = roomConfig.height + WALL_THICKNESS_CM;
    
    // Expand bounds to include door swings (which can extend beyond room walls)
    items.forEach((item) => {
      if (item.type?.toLowerCase() === 'door') {
        const doorWidth = item.width || 90; // Door width along wall
        
        // Check which wall the door is on and extend bounds for swing
        const isOnTopWall = Math.abs(item.y - (-WALL_THICKNESS_CM)) < 1;
        const isOnBottomWall = Math.abs(item.y - roomConfig.height) < 1;
        const isOnLeftWall = Math.abs(item.x - (-WALL_THICKNESS_CM)) < 1;
        const isOnRightWall = Math.abs(item.x - roomConfig.width) < 1;
        
        // Door swings extend by door width perpendicular to wall
        if (isOnTopWall) {
          minY = Math.min(minY, item.y - doorWidth); // Swing outside (upward)
          maxY = Math.max(maxY, item.y + doorWidth); // Swing inside (downward)
        } else if (isOnBottomWall) {
          minY = Math.min(minY, item.y - doorWidth); // Swing inside (upward)
          maxY = Math.max(maxY, item.y + doorWidth); // Swing outside (downward)
        } else if (isOnLeftWall) {
          minX = Math.min(minX, item.x - doorWidth); // Swing outside (leftward)
          maxX = Math.max(maxX, item.x + doorWidth); // Swing inside (rightward)
        } else if (isOnRightWall) {
          minX = Math.min(minX, item.x - doorWidth); // Swing inside (leftward)
          maxX = Math.max(maxX, item.x + doorWidth); // Swing outside (rightward)
        }
      }
    });
    
    // Add small padding to bounding box (in cm)
    const boundsPaddingCm = 20; // 20cm padding around content
    minX -= boundsPaddingCm;
    minY -= boundsPaddingCm;
    maxX += boundsPaddingCm;
    maxY += boundsPaddingCm;
    
    // Convert to pixels for Konva
    const contentWidthCm = maxX - minX;
    const contentHeightCm = maxY - minY;
    const contentWidthPx = contentWidthCm * PIXELS_PER_CM;
    const contentHeightPx = contentHeightCm * PIXELS_PER_CM;
    
    // Find the layer and get its position/scale
    const layer = stage.findOne('Layer');
    const layerX = layer.x();
    const layerY = layer.y();
    const layerScale = layer.scaleX(); // Assuming uniform scale
    
    // Calculate crop area in stage coordinates
    const cropX = (minX * PIXELS_PER_CM * layerScale) + layerX;
    const cropY = (minY * PIXELS_PER_CM * layerScale) + layerY;
    const cropWidth = contentWidthPx * layerScale;
    const cropHeight = contentHeightPx * layerScale;
    
    console.log('[PDF Export Blueprint] Content bounds (cm):', { minX, minY, maxX, maxY });
    console.log('[PDF Export Blueprint] Content size (px):', contentWidthPx, 'x', contentHeightPx);
    console.log('[PDF Export Blueprint] Crop area:', { x: cropX, y: cropY, width: cropWidth, height: cropHeight });
    
    // Export only the content area as data URL
    let dataURL: string;
    try {
      dataURL = stage.toDataURL({
        pixelRatio: 2,
        x: cropX,
        y: cropY,
        width: cropWidth,
        height: cropHeight,
      });
      console.log('[PDF Export Blueprint] Canvas exported, dataURL length:', dataURL.length);
    } catch (canvasError) {
      console.error('[PDF Export Blueprint] Failed to export canvas:', canvasError);
      alert('Failed to capture canvas. Please try again.');
      return false;
    }

    const pdf = new jsPDF({
      orientation: contentWidthCm > contentHeightCm ? 'landscape' : 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 15;

    // Add title
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.text(roomName, pageWidth / 2, margin, { align: 'center' });

    // Add room info
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(
      `${roomConfig.width} × ${roomConfig.height} cm | Ceiling: ${ceilingHeight} cm`,
      pageWidth / 2,
      margin + 7,
      { align: 'center' }
    );

    // Calculate image dimensions to fill available page space
    const imgAspectRatio = contentWidthCm / contentHeightCm;
    
    const contentWidth = pageWidth - 2 * margin;
    const availableHeight = pageHeight - margin - 35;
    
    let imgWidth = contentWidth;
    let imgHeight = imgWidth / imgAspectRatio;

    if (imgHeight > availableHeight) {
      imgHeight = availableHeight;
      imgWidth = imgHeight * imgAspectRatio;
    }

    const imgX = (pageWidth - imgWidth) / 2;
    const imgY = margin + 12;

    pdf.addImage(dataURL, 'PNG', imgX, imgY, imgWidth, imgHeight);

    // Add footer with timestamp
    pdf.setFontSize(8);
    pdf.setTextColor(120);
    pdf.text(
      `Generated ${new Date().toLocaleString()}`,
      pageWidth - margin,
      pageHeight - 5,
      { align: 'right' }
    );

    const filename = `${roomName.replace(/\s+/g, '_')}_blueprint.pdf`;
    console.log('[PDF Export Blueprint] PDF created, triggering download:', filename);
    
    return downloadPDF(pdf, filename);
  } catch (error) {
    console.error('[PDF Export Blueprint] Error:', error);
    alert('Error creating PDF. Check console for details.');
    return false;
  }
}

// Export measurements view as PDF - uses Konva stage for clean room-only export
export async function exportMeasurementsAsPDF(
  stageRef: any, // Konva Stage ref
  roomName: string,
  roomConfig: RoomConfig,
  ceilingHeight: number,
  items: FurnitureItem[]
): Promise<boolean> {
  try {
    console.log('[PDF Export Measurements] Starting...');
    console.log('[PDF Export Measurements] stageRef:', stageRef);
    console.log('[PDF Export Measurements] stageRef?.current:', stageRef?.current);
    
    if (!stageRef?.current) {
      console.error('[PDF Export Measurements] Stage ref not available');
      alert('Canvas not ready. Please try again.');
      return false;
    }

    const stage = stageRef.current;
    console.log('[PDF Export Measurements] Stage object:', stage);
    console.log('[PDF Export Measurements] Stage dimensions:', stage.width(), 'x', stage.height());
    
    // Calculate the bounding box of actual content (room + furniture + door swings)
    const PIXELS_PER_CM = 4;
    const WALL_THICKNESS_CM = 2.5;
    
    // Room bounds (accounting for wall thickness)
    let minX = -WALL_THICKNESS_CM;
    let minY = -WALL_THICKNESS_CM;
    let maxX = roomConfig.width + WALL_THICKNESS_CM;
    let maxY = roomConfig.height + WALL_THICKNESS_CM;
    
    // Expand bounds to include door swings (which can extend beyond room walls)
    items.forEach((item) => {
      if (item.type?.toLowerCase() === 'door') {
        const doorWidth = item.width || 90; // Door width along wall
        
        // Check which wall the door is on and extend bounds for swing
        const isOnTopWall = Math.abs(item.y - (-WALL_THICKNESS_CM)) < 1;
        const isOnBottomWall = Math.abs(item.y - roomConfig.height) < 1;
        const isOnLeftWall = Math.abs(item.x - (-WALL_THICKNESS_CM)) < 1;
        const isOnRightWall = Math.abs(item.x - roomConfig.width) < 1;
        
        // Door swings extend by door width perpendicular to wall
        if (isOnTopWall) {
          minY = Math.min(minY, item.y - doorWidth); // Swing outside (upward)
          maxY = Math.max(maxY, item.y + doorWidth); // Swing inside (downward)
        } else if (isOnBottomWall) {
          minY = Math.min(minY, item.y - doorWidth); // Swing inside (upward)
          maxY = Math.max(maxY, item.y + doorWidth); // Swing outside (downward)
        } else if (isOnLeftWall) {
          minX = Math.min(minX, item.x - doorWidth); // Swing outside (leftward)
          maxX = Math.max(maxX, item.x + doorWidth); // Swing inside (rightward)
        } else if (isOnRightWall) {
          minX = Math.min(minX, item.x - doorWidth); // Swing inside (leftward)
          maxX = Math.max(maxX, item.x + doorWidth); // Swing outside (rightward)
        }
      }
    });
    
    // Add small padding to bounding box (in cm)
    const boundsPaddingCm = 20; // 20cm padding around content
    minX -= boundsPaddingCm;
    minY -= boundsPaddingCm;
    maxX += boundsPaddingCm;
    maxY += boundsPaddingCm;
    
    // Convert to pixels for Konva
    const contentWidthCm = maxX - minX;
    const contentHeightCm = maxY - minY;
    const contentWidthPx = contentWidthCm * PIXELS_PER_CM;
    const contentHeightPx = contentHeightCm * PIXELS_PER_CM;
    
    // Find the layer and get its position/scale
    const layer = stage.findOne('Layer');
    const layerX = layer.x();
    const layerY = layer.y();
    const layerScale = layer.scaleX(); // Assuming uniform scale
    
    // Calculate crop area in stage coordinates
    const cropX = (minX * PIXELS_PER_CM * layerScale) + layerX;
    const cropY = (minY * PIXELS_PER_CM * layerScale) + layerY;
    const cropWidth = contentWidthPx * layerScale;
    const cropHeight = contentHeightPx * layerScale;
    
    console.log('[PDF Export Measurements] Content bounds (cm):', { minX, minY, maxX, maxY });
    console.log('[PDF Export Measurements] Content size (px):', contentWidthPx, 'x', contentHeightPx);
    console.log('[PDF Export Measurements] Crop area:', { x: cropX, y: cropY, width: cropWidth, height: cropHeight });
    
    // Export only the content area as data URL
    let dataURL: string;
    try {
      dataURL = stage.toDataURL({
        pixelRatio: 2,
        x: cropX,
        y: cropY,
        width: cropWidth,
        height: cropHeight,
      });
      console.log('[PDF Export Measurements] Canvas exported, dataURL length:', dataURL.length);
    } catch (canvasError) {
      console.error('[PDF Export Measurements] Failed to export canvas:', canvasError);
      alert('Failed to capture canvas. Please try again.');
      return false;
    }

    const pdf = new jsPDF({
      orientation: contentWidthCm > contentHeightCm ? 'landscape' : 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 15;
    const timestamp = new Date().toLocaleString();

    // Helper function to add footer to current page
    const addFooter = () => {
      pdf.setFontSize(8);
      pdf.setTextColor(120);
      pdf.text(
        `Generated ${timestamp}`,
        pageWidth - margin,
        pageHeight - 5,
        { align: 'right' }
      );
    };

    // Page 1: Visual with measurements
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`${roomName} - Measurements`, pageWidth / 2, margin, {
      align: 'center',
    });

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(
      `Room: ${roomConfig.width} × ${roomConfig.height} cm | Ceiling: ${ceilingHeight} cm`,
      pageWidth / 2,
      margin + 7,
      { align: 'center' }
    );

    // Calculate image dimensions to fill available page space
    const imgAspectRatio = contentWidthCm / contentHeightCm;
    
    const contentWidth = pageWidth - 2 * margin;
    const availableHeight = pageHeight - margin - 65;
    
    let imgWidth = contentWidth;
    let imgHeight = imgWidth / imgAspectRatio;

    if (imgHeight > availableHeight) {
      imgHeight = availableHeight;
      imgWidth = imgHeight * imgAspectRatio;
    }

    const imgX = (pageWidth - imgWidth) / 2;
    const imgY = margin + 12;

    pdf.addImage(dataURL, 'PNG', imgX, imgY, imgWidth, imgHeight);

    // Add footer to page 1
    addFooter();

    // Page 2: Detailed measurements list
    pdf.addPage();
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Item List & Measurements', margin, margin);

    let yPos = margin + 12;
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');

    // Room measurements
    pdf.setFont('helvetica', 'bold');
    pdf.text('Room:', margin, yPos);
    yPos += 6;
    pdf.setFont('helvetica', 'normal');
    pdf.text(`• Width: ${roomConfig.width} cm`, margin + 5, yPos);
    yPos += 5;
    pdf.text(`• Length: ${roomConfig.height} cm`, margin + 5, yPos);
    yPos += 5;
    pdf.text(`• Ceiling Height: ${ceilingHeight} cm`, margin + 5, yPos);
    yPos += 10;

    // Items list
    if (items.length > 0) {
      pdf.setFont('helvetica', 'bold');
      pdf.text('Items:', margin, yPos);
      yPos += 6;

      items.forEach((item, index) => {
        if (yPos > pageHeight - 25) {
          pdf.addPage();
          addFooter(); // Add footer to new page
          yPos = margin;
        }

        const typeLower = item.type.toLowerCase();
        const isWindow = typeLower === 'window';
        const isDoor = typeLower === 'door';
        const isWallObject = isWindow || isDoor;

        pdf.setFont('helvetica', 'bold');
        pdf.text(`${index + 1}. ${item.type}`, margin + 5, yPos);
        yPos += 5;

        pdf.setFont('helvetica', 'normal');
        
        if (isWindow) {
          // Windows: Show width, height, and floor distance
          pdf.text(
            `   Width: ${item.width} cm`,
            margin + 5,
            yPos
          );
          yPos += 5;
          pdf.text(
            `   Height: ${item.height} cm`,
            margin + 5,
            yPos
          );
          yPos += 5;
          if (item.floorDistance !== undefined) {
            pdf.text(
              `   Distance from floor: ${item.floorDistance} cm`,
              margin + 5,
              yPos
            );
            yPos += 5;
          }
        } else if (isDoor) {
          // Doors: Show width and height only
          pdf.text(
            `   Width: ${item.width} cm`,
            margin + 5,
            yPos
          );
          yPos += 5;
          pdf.text(
            `   Height: ${item.height} cm`,
            margin + 5,
            yPos
          );
          yPos += 5;
        } else {
          // Regular furniture: Show dimensions, position, and rotation
          pdf.text(
            `   Dimensions: ${item.width} × ${item.height} cm`,
            margin + 5,
            yPos
          );
          yPos += 5;
          pdf.text(
            `   Position: X: ${Math.round(item.x)} cm, Y: ${Math.round(item.y)} cm`,
            margin + 5,
            yPos
          );
          yPos += 5;
          if (item.rotation !== 0) {
            pdf.text(`   Rotation: ${item.rotation}°`, margin + 5, yPos);
            yPos += 5;
          }
        }
        
        yPos += 3;
      });
    }

    // Add footer to last page
    addFooter();

    const filename = `${roomName.replace(/\s+/g, '_')}_measurements.pdf`;
    console.log('[PDF Export Measurements] PDF created, triggering download:', filename);
    
    return downloadPDF(pdf, filename);
  } catch (error) {
    console.error('[PDF Export Measurements] Error:', error);
    alert('Error creating PDF. Check console for details.');
    return false;
  }
}

/**
 * Export options for complete PDF
 */
export interface ExportPDFOptions {
  stageRef: any; // Konva Stage ref
  roomName: string;
  roomConfig: RoomConfig;
  ceilingHeight: number;
  items: FurnitureItem[];
  // Callbacks to toggle canvas state for different views
  setShowLabels?: (show: boolean) => void;
  setShowAllMeasurements?: (show: boolean) => void;
  // Hidden measurements to completely remove from measurement view
  hiddenMeasurements?: Set<string>;
  setHiddenMeasurementsForExport?: (ids: Set<string>) => void;
}

/**
 * Helper function to wait for canvas re-render
 */
function waitForRender(ms: number = 100): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Export a complete PDF with both eye view and measurements views
 * Page 1: Eye View (labels on furniture, clean layout)
 * Page 2: Measurements (with hidden measurements completely removed)
 * Page 3+: Item list with dimensions and details
 */
export async function exportCompletePDF(
  stageRef: any, // Konva Stage ref
  roomName: string,
  roomConfig: RoomConfig,
  ceilingHeight: number,
  items: FurnitureItem[],
  options?: {
    setShowLabels?: (show: boolean) => void;
    setShowAllMeasurements?: (show: boolean) => void;
    hiddenMeasurements?: Set<string>;
    setHiddenMeasurementsForExport?: (ids: Set<string>) => void;
  }
): Promise<boolean> {
  try {
    console.log('[PDF Export Complete] Starting combined PDF export...');
    
    if (!stageRef?.current) {
      console.error('[PDF Export Complete] Stage ref not available');
      alert('Canvas not ready. Please try again.');
      return false;
    }

    const stage = stageRef.current;
    const PIXELS_PER_CM = 4;
    const WALL_THICKNESS_CM = 2.5;
    
    // Store original state to restore later
    const originalHiddenMeasurements = options?.hiddenMeasurements ? new Set(options.hiddenMeasurements) : new Set<string>();
    
    // === STEP 1: Calculate content bounding box ===
    let minX = -WALL_THICKNESS_CM;
    let minY = -WALL_THICKNESS_CM;
    let maxX = roomConfig.width + WALL_THICKNESS_CM;
    let maxY = roomConfig.height + WALL_THICKNESS_CM;
    
    // Expand bounds for door swings
    items.forEach((item) => {
      if (item.type?.toLowerCase() === 'door') {
        const doorWidth = item.width || 90;
        const isOnTopWall = Math.abs(item.y - (-WALL_THICKNESS_CM)) < 1;
        const isOnBottomWall = Math.abs(item.y - roomConfig.height) < 1;
        const isOnLeftWall = Math.abs(item.x - (-WALL_THICKNESS_CM)) < 1;
        const isOnRightWall = Math.abs(item.x - roomConfig.width) < 1;
        
        if (isOnTopWall) {
          minY = Math.min(minY, item.y - doorWidth);
          maxY = Math.max(maxY, item.y + doorWidth);
        } else if (isOnBottomWall) {
          minY = Math.min(minY, item.y - doorWidth);
          maxY = Math.max(maxY, item.y + doorWidth);
        } else if (isOnLeftWall) {
          minX = Math.min(minX, item.x - doorWidth);
          maxX = Math.max(maxX, item.x + doorWidth);
        } else if (isOnRightWall) {
          minX = Math.min(minX, item.x - doorWidth);
          maxX = Math.max(maxX, item.x + doorWidth);
        }
      }
    });
    
    const boundsPaddingCm = 20;
    minX -= boundsPaddingCm;
    minY -= boundsPaddingCm;
    maxX += boundsPaddingCm;
    maxY += boundsPaddingCm;
    
    const contentWidthCm = maxX - minX;
    const contentHeightCm = maxY - minY;
    const contentWidthPx = contentWidthCm * PIXELS_PER_CM;
    const contentHeightPx = contentHeightCm * PIXELS_PER_CM;
    
    const layer = stage.findOne('Layer');
    const layerX = layer.x();
    const layerY = layer.y();
    const layerScale = layer.scaleX();
    
    const cropX = minX * PIXELS_PER_CM * layerScale + layerX;
    const cropY = minY * PIXELS_PER_CM * layerScale + layerY;
    const cropWidth = contentWidthPx * layerScale;
    const cropHeight = contentHeightPx * layerScale;
    
    console.log('[PDF Export Complete] Content bounds:', { minX, minY, maxX, maxY, contentWidthCm, contentHeightCm });
    console.log('[PDF Export Complete] Crop area:', { cropX, cropY, cropWidth, cropHeight });
    
    // === STEP 2: Determine PDF orientation ===
    const orientation = contentWidthCm > contentHeightCm ? 'landscape' : 'portrait';
    const pdf = new jsPDF({
      orientation,
      unit: 'mm',
      format: 'a4',
    });
    
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 15;
    const headerHeight = 22; // Space for title and room info
    const footerHeight = 10; // Space for timestamp
    const contentArea = {
      width: pageWidth - margin * 2,
      height: pageHeight - headerHeight - footerHeight - margin,
    };
    
    console.log('[PDF Export Complete] PDF setup:', { orientation, pageWidth, pageHeight, contentArea });
    
    // Helper: Add footer with timestamp
    const addFooter = () => {
      const timestamp = new Date().toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
      pdf.setFontSize(8);
      pdf.setTextColor(150, 150, 150);
      pdf.text(timestamp, pageWidth - margin, pageHeight - 5, { align: 'right' });
    };
    
    // Helper: Add header
    const addHeader = (title: string) => {
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(0, 0, 0);
      pdf.text(title, margin, margin);
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(100, 100, 100);
      pdf.text(
        `${roomConfig.width} × ${roomConfig.height} cm  •  Ceiling: ${ceilingHeight} cm`,
        margin,
        margin + 6
      );
    };
    
    // Calculate image dimensions to fit content area while maintaining aspect ratio
    const contentAspect = contentWidthPx / contentHeightPx;
    let imgWidth: number, imgHeight: number;
    
    if (contentAspect > contentArea.width / contentArea.height) {
      imgWidth = contentArea.width;
      imgHeight = imgWidth / contentAspect;
    } else {
      imgHeight = contentArea.height;
      imgWidth = imgHeight * contentAspect;
    }
    
    const imgX = margin + (contentArea.width - imgWidth) / 2;
    const imgY = headerHeight + (contentArea.height - imgHeight) / 2;
    
    // === PAGE 1: EYE VIEW (Labels) ===
    console.log('[PDF Export Complete] Generating Page 1: Eye View (Labels)...');
    
    // Set canvas to labels view (no measurements)
    if (options?.setShowLabels) {
      options.setShowLabels(true);
    }
    if (options?.setShowAllMeasurements) {
      options.setShowAllMeasurements(false);
    }
    
    // Wait for canvas to re-render
    await waitForRender(150);
    
    // Export canvas as PNG (cropped to content)
    const eyeViewDataUrl = stage.toDataURL({
      x: cropX,
      y: cropY,
      width: cropWidth,
      height: cropHeight,
      pixelRatio: 2, // Higher quality
    });
    
    // Add header and image
    addHeader(`${roomName} - Eye View`);
    pdf.addImage(eyeViewDataUrl, 'PNG', imgX, imgY, imgWidth, imgHeight);
    addFooter();
    
    // === PAGE 2: MEASUREMENTS VIEW ===
    console.log('[PDF Export Complete] Generating Page 2: Measurements View...');
    pdf.addPage();
    
    // Set canvas to measurements view
    if (options?.setShowLabels) {
      options.setShowLabels(false);
    }
    if (options?.setShowAllMeasurements) {
      options.setShowAllMeasurements(true);
    }
    
    // For export, completely hide the hidden measurements by setting them to export mode
    // The MeasurementOverlay will check for this and render hidden ones as completely invisible
    if (options?.setHiddenMeasurementsForExport && originalHiddenMeasurements.size > 0) {
      // Signal to the canvas that we're in export mode - hidden measurements should be fully hidden
      options.setHiddenMeasurementsForExport(originalHiddenMeasurements);
    }
    
    // Wait for canvas to re-render
    await waitForRender(150);
    
    // Export canvas with measurements visible (same crop area)
    const measurementsDataUrl = stage.toDataURL({
      x: cropX,
      y: cropY,
      width: cropWidth,
      height: cropHeight,
      pixelRatio: 2,
    });
    
    // Reset export mode for hidden measurements
    if (options?.setHiddenMeasurementsForExport) {
      options.setHiddenMeasurementsForExport(new Set());
    }
    
    // Add header and image
    addHeader(`${roomName} - Measurements`);
    pdf.addImage(measurementsDataUrl, 'PNG', imgX, imgY, imgWidth, imgHeight);
    addFooter();
    
    // === PAGE 3+: ITEM LIST ===
    console.log('[PDF Export Complete] Generating Page 3+: Item List...');
    
    if (items.length > 0) {
      pdf.addPage();
      
      // Title
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(0, 0, 0);
      pdf.text(`${roomName} - Item List`, margin, margin);
      
      let yPos = margin + 12;
      const lineHeight = 6;
      const maxY = pageHeight - margin - 10;
      
      // Group items by type
      const doors = items.filter(i => i.type?.toLowerCase() === 'door');
      const windows = items.filter(i => i.type?.toLowerCase() === 'window');
      const furniture = items.filter(i => {
        const t = i.type?.toLowerCase();
        return t !== 'door' && t !== 'window';
      });
      
      // Helper to render item group
      const renderItemGroup = (groupName: string, groupItems: FurnitureItem[]) => {
        if (groupItems.length === 0) return;
        
        // Check if we need a new page
        if (yPos + lineHeight * 3 > maxY) {
          addFooter();
          pdf.addPage();
          pdf.setFontSize(16);
          pdf.setFont('helvetica', 'bold');
          pdf.text(`${roomName} - Item List (continued)`, margin, margin);
          yPos = margin + 12;
        }
        
        // Group header
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(60, 60, 60);
        pdf.text(groupName, margin, yPos);
        yPos += lineHeight + 2;
        
        groupItems.forEach((item, index) => {
          // Check if we need a new page
          if (yPos + lineHeight * 3 > maxY) {
            addFooter();
            pdf.addPage();
            pdf.setFontSize(16);
            pdf.setFont('helvetica', 'bold');
            pdf.text(`${roomName} - Item List (continued)`, margin, margin);
            yPos = margin + 12;
          }
          
          const isWindow = item.type?.toLowerCase() === 'window';
          
          // Item name
          pdf.setFontSize(10);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(0, 0, 0);
          pdf.text(`${index + 1}. ${item.type || 'Unknown'}`, margin + 5, yPos);
          
          // Dimensions on same line
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(80, 80, 80);
          let dimText = `${item.width} × ${item.height} cm`;
          if (isWindow && item.floorDistance !== undefined) {
            dimText += ` (${item.floorDistance} cm from floor)`;
          }
          pdf.text(dimText, margin + 60, yPos);
          
          yPos += lineHeight;
        });
        
        yPos += 4; // Extra spacing between groups
      };
      
      // Render each group
      renderItemGroup('Doors', doors);
      renderItemGroup('Windows', windows);
      renderItemGroup('Furniture', furniture);
      
      addFooter();
    }
    
    // === RESTORE ORIGINAL CANVAS STATE ===
    console.log('[PDF Export Complete] Restoring canvas state...');
    if (options?.setShowLabels) {
      options.setShowLabels(false);
    }
    if (options?.setShowAllMeasurements) {
      options.setShowAllMeasurements(false);
    }
    
    // === DOWNLOAD ===
    const filename = `${roomName.replace(/\s+/g, '_')}_complete.pdf`;
    console.log('[PDF Export Complete] PDF created, triggering download:', filename);
    
    return downloadPDF(pdf, filename);
  } catch (error) {
    console.error('[PDF Export Complete] Error:', error);
    alert('Error creating PDF. Check console for details.');
    return false;
  }
}
