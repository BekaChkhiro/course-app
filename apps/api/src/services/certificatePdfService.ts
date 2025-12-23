import PDFDocument from 'pdfkit';

interface CertificateData {
  studentName: string;
  courseTitle: string;
  certificateNumber: string;
  issuedAt: Date;
  score?: number;
}

function formatGeorgianDate(date: Date): string {
  const months = [
    'იანვარი', 'თებერვალი', 'მარტი', 'აპრილი', 'მაისი', 'ივნისი',
    'ივლისი', 'აგვისტო', 'სექტემბერი', 'ოქტომბერი', 'ნოემბერი', 'დეკემბერი'
  ];
  return `${date.getDate()} ${months[date.getMonth()]}, ${date.getFullYear()}`;
}

export async function generateCertificatePDF(data: CertificateData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      // Create PDF in landscape A4
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margins: { top: 40, bottom: 40, left: 50, right: 50 }
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;
      const centerX = pageWidth / 2;

      // Colors
      const primaryColor = '#0e3355';
      const accentColor = '#ff4d40';
      const lightGray = '#9CA3AF';

      // Background gradient effect (light)
      doc.rect(0, 0, pageWidth, pageHeight)
        .fill('#fefefe');

      // Outer border
      doc.rect(25, 25, pageWidth - 50, pageHeight - 50)
        .lineWidth(2)
        .stroke(primaryColor);

      // Inner border
      doc.rect(35, 35, pageWidth - 70, pageHeight - 70)
        .lineWidth(0.5)
        .strokeOpacity(0.3)
        .stroke(primaryColor);

      // Reset opacity
      doc.strokeOpacity(1);

      // Corner decorations (L-shaped)
      const cornerSize = 30;
      const cornerThickness = 5;
      const cornerOffset = 45;

      // Top-left corner
      doc.polygon(
        [cornerOffset, cornerOffset],
        [cornerOffset + cornerSize, cornerOffset],
        [cornerOffset + cornerSize, cornerOffset + cornerThickness],
        [cornerOffset + cornerThickness, cornerOffset + cornerThickness],
        [cornerOffset + cornerThickness, cornerOffset + cornerSize],
        [cornerOffset, cornerOffset + cornerSize]
      ).fillOpacity(0.5).fill(accentColor);

      // Top-right corner
      doc.polygon(
        [pageWidth - cornerOffset, cornerOffset],
        [pageWidth - cornerOffset, cornerOffset + cornerSize],
        [pageWidth - cornerOffset - cornerThickness, cornerOffset + cornerSize],
        [pageWidth - cornerOffset - cornerThickness, cornerOffset + cornerThickness],
        [pageWidth - cornerOffset - cornerSize, cornerOffset + cornerThickness],
        [pageWidth - cornerOffset - cornerSize, cornerOffset]
      ).fill(accentColor);

      // Bottom-left corner
      doc.polygon(
        [cornerOffset, pageHeight - cornerOffset],
        [cornerOffset + cornerSize, pageHeight - cornerOffset],
        [cornerOffset + cornerSize, pageHeight - cornerOffset - cornerThickness],
        [cornerOffset + cornerThickness, pageHeight - cornerOffset - cornerThickness],
        [cornerOffset + cornerThickness, pageHeight - cornerOffset - cornerSize],
        [cornerOffset, pageHeight - cornerOffset - cornerSize]
      ).fill(accentColor);

      // Bottom-right corner
      doc.polygon(
        [pageWidth - cornerOffset, pageHeight - cornerOffset],
        [pageWidth - cornerOffset, pageHeight - cornerOffset - cornerSize],
        [pageWidth - cornerOffset - cornerThickness, pageHeight - cornerOffset - cornerSize],
        [pageWidth - cornerOffset - cornerThickness, pageHeight - cornerOffset - cornerThickness],
        [pageWidth - cornerOffset - cornerSize, pageHeight - cornerOffset - cornerThickness],
        [pageWidth - cornerOffset - cornerSize, pageHeight - cornerOffset]
      ).fill(accentColor);

      // Reset opacity
      doc.fillOpacity(1);

      // Top decorative line
      const lineY = 55;
      doc.moveTo(centerX - 80, lineY)
        .lineTo(centerX - 10, lineY)
        .strokeOpacity(0.5)
        .stroke(accentColor);

      // Diamond in center
      doc.polygon(
        [centerX, lineY - 5],
        [centerX + 5, lineY],
        [centerX, lineY + 5],
        [centerX - 5, lineY]
      ).fillOpacity(0.5).fill(accentColor);

      doc.moveTo(centerX + 10, lineY)
        .lineTo(centerX + 80, lineY)
        .strokeOpacity(0.5)
        .stroke(accentColor);

      doc.fillOpacity(1);
      doc.strokeOpacity(1);

      // Logo text (since we can't embed an image easily)
      let currentY = 85;
      doc.fontSize(16)
        .fillColor(primaryColor)
        .text('KURSEBI.ONLINE', centerX - 80, currentY, { width: 160, align: 'center' });

      // Title
      currentY += 40;
      doc.fontSize(36)
        .fillColor(primaryColor)
        .text('CERTIFICATE', centerX - 200, currentY, { width: 400, align: 'center' });

      // Star divider
      currentY += 25;
      doc.moveTo(centerX - 80, currentY)
        .lineTo(centerX - 10, currentY)
        .stroke(accentColor);

      // Star
      doc.fontSize(14).fillColor(accentColor).text('★', centerX - 5, currentY - 7);

      doc.moveTo(centerX + 10, currentY)
        .lineTo(centerX + 80, currentY)
        .stroke(accentColor);

      // "This is to certify that"
      currentY += 25;
      doc.fontSize(11)
        .fillColor('#6B7280')
        .font('Helvetica-Oblique')
        .text('This is to certify that', centerX - 150, currentY, { width: 300, align: 'center' });

      // Student Name
      currentY += 25;
      doc.fontSize(28)
        .fillColor(primaryColor)
        .font('Helvetica-Bold')
        .text(data.studentName, centerX - 250, currentY, { width: 500, align: 'center' });

      // Underline decoration
      currentY += 40;
      const underlineWidth = 200;
      doc.moveTo(centerX - underlineWidth/2, currentY)
        .lineTo(centerX + underlineWidth/2, currentY)
        .lineWidth(2)
        .stroke(accentColor);

      // "has successfully completed the course"
      currentY += 20;
      doc.fontSize(11)
        .fillColor('#6B7280')
        .font('Helvetica')
        .text('has successfully completed the course', centerX - 150, currentY, { width: 300, align: 'center' });

      // Course Title
      currentY += 25;
      doc.fontSize(18)
        .fillColor(primaryColor)
        .font('Helvetica-Bold')
        .text(`"${data.courseTitle}"`, centerX - 300, currentY, { width: 600, align: 'center' });

      // Score (if provided)
      if (data.score !== undefined) {
        currentY += 35;
        doc.roundedRect(centerX - 40, currentY, 80, 28, 14)
          .fill(accentColor);
        doc.fontSize(14)
          .fillColor('#ffffff')
          .text(`${Math.round(data.score)}%`, centerX - 40, currentY + 6, { width: 80, align: 'center' });
      }

      // Date and Certificate Number
      currentY = pageHeight - 110;

      // Date
      doc.fontSize(10)
        .fillColor('#6B7280')
        .font('Helvetica')
        .text('Date:', centerX - 180, currentY, { width: 80, align: 'right' });
      doc.fillColor('#374151')
        .text(formatGeorgianDate(data.issuedAt), centerX - 95, currentY);

      // Separator dot
      doc.fontSize(8)
        .fillColor(lightGray)
        .text('•', centerX - 5, currentY + 1);

      // Certificate ID
      doc.fontSize(10)
        .fillColor('#6B7280')
        .text('ID:', centerX + 15, currentY);
      doc.fillColor('#374151')
        .font('Courier')
        .text(data.certificateNumber, centerX + 35, currentY);

      // Bottom decorative line
      const bottomLineY = pageHeight - 70;
      doc.moveTo(centerX - 50, bottomLineY)
        .lineTo(centerX - 10, bottomLineY)
        .strokeOpacity(0.3)
        .stroke(primaryColor);

      doc.circle(centerX, bottomLineY, 3)
        .fillOpacity(0.3)
        .fill(primaryColor);

      doc.moveTo(centerX + 10, bottomLineY)
        .lineTo(centerX + 50, bottomLineY)
        .strokeOpacity(0.3)
        .stroke(primaryColor);

      // Finalize PDF
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
