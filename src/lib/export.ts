import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { RoomConfig, FurnitureItem } from '@/types';

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
    console.log('[PDF Export Blueprint] Starting blueprint PDF export...');
    
    if (!stageRef?.current) {
      console.error('[PDF Export Blueprint] Stage ref not available');
      return false;
    }

    // Get the Konva stage and export as data URL
    const stage = stageRef.current;
    const dataURL = stage.toDataURL({ pixelRatio: 2 }); // High quality export
    
    console.log('[PDF Export Blueprint] Canvas captured from Konva stage');

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
    const availableHeight = pageHeight - margin - 35; // Space for title and footer
    
    let imgWidth = contentWidth;
    let imgHeight = imgWidth / imgAspectRatio;

    if (imgHeight > availableHeight) {
      imgHeight = availableHeight;
      imgWidth = imgHeight * imgAspectRatio;
    }

    // Center image on page
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

    const filename = `${roomName.replace(/\s+/g, '_')}_blueprint_${Date.now()}.pdf`;
    console.log('[PDF Export Blueprint] Saving PDF:', filename);
    
    pdf.save(filename);
    
    console.log('[PDF Export Blueprint] PDF save triggered');
    return true;
  } catch (error) {
    console.error('[PDF Export Blueprint] Error exporting PDF:', error);
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
    console.log('[PDF Export] Starting measurements PDF export...');
    
    if (!stageRef?.current) {
      console.error('[PDF Export] Stage ref not available');
      return false;
    }

    // Get the Konva stage and export as data URL
    const stage = stageRef.current;
    const dataURL = stage.toDataURL({ pixelRatio: 2 }); // High quality export
    
    console.log('[PDF Export] Canvas captured from Konva stage');
    
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });
    
    console.log('[PDF Export] jsPDF instance created');

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

    // Add canvas image
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
        yPos += 3; // Extra spacing between items
      });
    }

    // Footer with timestamp on last page
    pdf.setFontSize(8);
    pdf.setTextColor(120);
    pdf.text(
      `Generated ${new Date().toLocaleString()}`,
      pageWidth - margin,
      pageHeight - 5,
      { align: 'right' }
    );

    const filename = `${roomName.replace(/\s+/g, '_')}_measurements_${Date.now()}.pdf`;
    console.log('[PDF Export] Saving PDF:', filename);
    
    pdf.save(filename);
    
    console.log('[PDF Export] PDF save triggered');
    return true;
  } catch (error) {
    console.error('[PDF Export] Error exporting measurements PDF:', error);
    return false;
  }
}
