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
  ceilingHeight: number
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
    
    // Export canvas as data URL
    let dataURL: string;
    try {
      dataURL = stage.toDataURL({ pixelRatio: 2 });
      console.log('[PDF Export Blueprint] Canvas exported, dataURL length:', dataURL.length);
    } catch (canvasError) {
      console.error('[PDF Export Blueprint] Failed to export canvas:', canvasError);
      alert('Failed to capture canvas. Please try again.');
      return false;
    }

    const pdf = new jsPDF({
      orientation: roomConfig.width > roomConfig.height ? 'landscape' : 'portrait',
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

    // Calculate image dimensions to fit page
    const stageWidth = stage.width();
    const stageHeight = stage.height();
    const imgAspectRatio = stageWidth / stageHeight;
    
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
    
    // Export canvas as data URL
    let dataURL: string;
    try {
      dataURL = stage.toDataURL({ pixelRatio: 2 });
      console.log('[PDF Export Measurements] Canvas exported, dataURL length:', dataURL.length);
    } catch (canvasError) {
      console.error('[PDF Export Measurements] Failed to export canvas:', canvasError);
      alert('Failed to capture canvas. Please try again.');
      return false;
    }
    
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 15;

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

    // Calculate image dimensions
    const stageWidth = stage.width();
    const stageHeight = stage.height();
    const imgAspectRatio = stageWidth / stageHeight;
    
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
          yPos = margin;
        }

        pdf.setFont('helvetica', 'bold');
        pdf.text(`${index + 1}. ${item.type}`, margin + 5, yPos);
        yPos += 5;

        pdf.setFont('helvetica', 'normal');
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
        yPos += 3;
      });
    }

    // Footer with timestamp
    pdf.setFontSize(8);
    pdf.setTextColor(120);
    pdf.text(
      `Generated ${new Date().toLocaleString()}`,
      pageWidth - margin,
      pageHeight - 5,
      { align: 'right' }
    );

    const filename = `${roomName.replace(/\s+/g, '_')}_measurements.pdf`;
    console.log('[PDF Export Measurements] PDF created, triggering download:', filename);
    
    return downloadPDF(pdf, filename);
  } catch (error) {
    console.error('[PDF Export Measurements] Error:', error);
    alert('Error creating PDF. Check console for details.');
    return false;
  }
}
