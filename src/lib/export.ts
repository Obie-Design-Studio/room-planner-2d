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

// Export canvas as PNG
export async function exportAsPNG(
  canvasContainer: HTMLElement,
  roomName: string
): Promise<boolean> {
  try {
    const canvas = await html2canvas(canvasContainer, {
      backgroundColor: '#FAFAFA',
      scale: 2, // Higher quality
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

// Export as PDF (Blueprint view)
export async function exportBlueprintAsPDF(
  canvasContainer: HTMLElement,
  roomName: string,
  roomConfig: RoomConfig,
  ceilingHeight: number
): Promise<boolean> {
  try {
    console.log('[PDF Export Blueprint] Starting blueprint PDF export...');
    
    const canvas = await html2canvas(canvasContainer, {
      backgroundColor: '#FFFFFF',
      scale: 1, // Reduced from 2 for smaller file size
      logging: false,
    });
    
    console.log('[PDF Export Blueprint] Canvas captured:', canvas.width, 'x', canvas.height);

    // Use JPEG with compression for smaller file size
    const imgData = canvas.toDataURL('image/jpeg', 0.8);
    console.log('[PDF Export Blueprint] Image data created (JPEG, 80% quality)');
    
    const pdf = new jsPDF({
      orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - 2 * margin;

    // Add title
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.text(roomName, pageWidth / 2, margin, { align: 'center' });

    // Add room info
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.text(
      `Dimensions: ${roomConfig.width} × ${roomConfig.height} cm | Ceiling: ${ceilingHeight} cm`,
      pageWidth / 2,
      margin + 10,
      { align: 'center' }
    );

    // Calculate image dimensions
    const imgAspectRatio = canvas.width / canvas.height;
    const availableHeight = pageHeight - margin - 40; // Leave space for title and footer
    let imgWidth = contentWidth;
    let imgHeight = imgWidth / imgAspectRatio;

    if (imgHeight > availableHeight) {
      imgHeight = availableHeight;
      imgWidth = imgHeight * imgAspectRatio;
    }

    // Center image
    const imgX = (pageWidth - imgWidth) / 2;
    const imgY = margin + 20;

    pdf.addImage(imgData, 'JPEG', imgX, imgY, imgWidth, imgHeight);

    // Add footer
    pdf.setFontSize(10);
    pdf.setTextColor(150);
    pdf.text(
      `Generated on ${new Date().toLocaleDateString()} | Room Planner 2D`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );

    const filename = `${roomName.replace(/\s+/g, '_')}_blueprint_${Date.now()}.pdf`;
    console.log('[PDF Export Blueprint] Creating blob for download:', filename);
    
    // Create blob with proper MIME type and trigger download
    const blob = pdf.output('blob');
    const url = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    
    console.log('[PDF Export Blueprint] Triggering download...');
    link.click();
    
    // Cleanup
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      console.log('[PDF Export Blueprint] Download triggered and cleaned up');
    }, 100);
    
    return true;
  } catch (error) {
    console.error('[PDF Export Blueprint] Error exporting PDF:', error);
    return false;
  }
}

// Export measurements view as PDF
export async function exportMeasurementsAsPDF(
  canvasContainer: HTMLElement,
  roomName: string,
  roomConfig: RoomConfig,
  ceilingHeight: number,
  items: FurnitureItem[]
): Promise<boolean> {
  try {
    console.log('[PDF Export] Starting measurements PDF export...');
    console.log('[PDF Export] Canvas container:', canvasContainer);
    
    const canvas = await html2canvas(canvasContainer, {
      backgroundColor: '#FFFFFF',
      scale: 1, // Reduced from 2 for smaller file size
      logging: false,
    });
    
    console.log('[PDF Export] Canvas captured:', canvas.width, 'x', canvas.height);

    // Use JPEG with compression for smaller file size
    const imgData = canvas.toDataURL('image/jpeg', 0.8);
    console.log('[PDF Export] Image data created (JPEG, 80% quality)');
    
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });
    
    console.log('[PDF Export] jsPDF instance created');

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;

    // Page 1: Visual with measurements
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`${roomName} - Measurements`, pageWidth / 2, margin, {
      align: 'center',
    });

    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.text(
      `Room: ${roomConfig.width} × ${roomConfig.height} cm | Ceiling: ${ceilingHeight} cm`,
      pageWidth / 2,
      margin + 10,
      { align: 'center' }
    );

    // Add canvas image
    const imgAspectRatio = canvas.width / canvas.height;
    const contentWidth = pageWidth - 2 * margin;
    const availableHeight = pageHeight - margin - 80;
    let imgWidth = contentWidth;
    let imgHeight = imgWidth / imgAspectRatio;

    if (imgHeight > availableHeight) {
      imgHeight = availableHeight;
      imgWidth = imgHeight * imgAspectRatio;
    }

    const imgX = (pageWidth - imgWidth) / 2;
    const imgY = margin + 20;

    pdf.addImage(imgData, 'JPEG', imgX, imgY, imgWidth, imgHeight);

    // Page 2: Detailed measurements list
    pdf.addPage();
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Item List & Measurements', margin, margin);

    let yPos = margin + 15;
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');

    // Room measurements
    pdf.setFont('helvetica', 'bold');
    pdf.text('Room:', margin, yPos);
    yPos += 7;
    pdf.setFont('helvetica', 'normal');
    pdf.text(`• Width: ${roomConfig.width} cm`, margin + 5, yPos);
    yPos += 6;
    pdf.text(`• Length: ${roomConfig.height} cm`, margin + 5, yPos);
    yPos += 6;
    pdf.text(`• Ceiling Height: ${ceilingHeight} cm`, margin + 5, yPos);
    yPos += 12;

    // Items list
    if (items.length > 0) {
      pdf.setFont('helvetica', 'bold');
      pdf.text('Items:', margin, yPos);
      yPos += 7;

      items.forEach((item, index) => {
        if (yPos > pageHeight - 30) {
          pdf.addPage();
          yPos = margin;
        }

        pdf.setFont('helvetica', 'bold');
        pdf.text(`${index + 1}. ${item.type}`, margin + 5, yPos);
        yPos += 6;

        pdf.setFont('helvetica', 'normal');
        pdf.text(
          `   Dimensions: ${item.width} × ${item.height} cm`,
          margin + 5,
          yPos
        );
        yPos += 6;
        pdf.text(
          `   Position: X: ${Math.round(item.x)} cm, Y: ${Math.round(item.y)} cm`,
          margin + 5,
          yPos
        );
        yPos += 6;
        if (item.rotation !== 0) {
          pdf.text(`   Rotation: ${item.rotation}°`, margin + 5, yPos);
          yPos += 6;
        }
        yPos += 3; // Extra spacing between items
      });
    }

    // Footer on last page
    pdf.setFontSize(10);
    pdf.setTextColor(150);
    pdf.text(
      `Generated on ${new Date().toLocaleDateString()} | Room Planner 2D`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );

    const filename = `${roomName.replace(/\s+/g, '_')}_measurements_${Date.now()}.pdf`;
    console.log('[PDF Export] Creating blob for download:', filename);
    
    // Create blob with proper MIME type and trigger download
    const blob = pdf.output('blob');
    const url = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    
    console.log('[PDF Export] Triggering download...');
    link.click();
    
    // Cleanup
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      console.log('[PDF Export] Download triggered and cleaned up');
    }, 100);
    
    console.log('[PDF Export] PDF download completed successfully');
    return true;
  } catch (error) {
    console.error('[PDF Export] Error exporting measurements PDF:', error);
    return false;
  }
}
