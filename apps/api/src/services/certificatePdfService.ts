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
      const primaryColor = '#0e3355'; // Dark blue
      const accentColor = '#ff4d40'; // Red
      const blackColor = '#000000';

      // White background
      doc.rect(0, 0, pageWidth, pageHeight)
        .fill('#ffffff');

      // Top horizontal dark blue line
      doc.rect(0, 0, pageWidth, 4)
        .fill(primaryColor);

      // Bottom horizontal dark blue line
      doc.rect(0, pageHeight - 4, pageWidth, 4)
        .fill(primaryColor);

      // Left vertical red line
      doc.rect(0, 0, 4, pageHeight)
        .fill(accentColor);

      // Right vertical red line
      doc.rect(pageWidth - 4, 0, 4, pageHeight)
        .fill(accentColor);

      // Top-left corner - Red and black outlined triangles
      const cornerSize = 50;
      const cornerOffset = 30;

      // Red triangle outline (top-left)
      doc.polygon(
        [cornerOffset, cornerOffset],
        [cornerOffset + cornerSize, cornerOffset],
        [cornerOffset, cornerOffset + cornerSize]
      )
        .lineWidth(2)
        .stroke(accentColor)
        .fill('none');

      // Black triangle outline (smaller, offset)
      const innerOffset = cornerOffset + 8;
      const innerSize = cornerSize - 16;
      doc.polygon(
        [innerOffset, innerOffset],
        [innerOffset + innerSize, innerOffset],
        [innerOffset, innerOffset + innerSize]
      )
        .lineWidth(1.5)
        .stroke(blackColor)
        .fill('none');

      // Bottom-right corner - Solid dark blue and black outlined triangles
      const brCornerX = pageWidth - cornerOffset - cornerSize;
      const brCornerY = pageHeight - cornerOffset - cornerSize;

      // Solid dark blue triangle (bottom-right)
      doc.polygon(
        [pageWidth - cornerOffset, pageHeight - cornerOffset - cornerSize],
        [pageWidth - cornerOffset, pageHeight - cornerOffset],
        [pageWidth - cornerOffset - cornerSize, pageHeight - cornerOffset]
      )
        .fill(primaryColor);

      // Black triangle outline (smaller, offset)
      const brInnerX = pageWidth - innerOffset - innerSize;
      const brInnerY = pageHeight - innerOffset - innerSize;
      doc.polygon(
        [pageWidth - innerOffset, brInnerY],
        [pageWidth - innerOffset, pageHeight - innerOffset],
        [brInnerX, pageHeight - innerOffset]
      )
        .lineWidth(1.5)
        .stroke(blackColor)
        .fill('none');

      // Main Content
      let currentY = 100;

      // Logo text
      doc.fontSize(18)
        .fillColor(primaryColor)
        .font('Helvetica-Bold')
        .text('KURSEBI', centerX - 100, currentY, { width: 200, align: 'center' });
      
      currentY += 20;
      doc.fontSize(12)
        .fillColor(primaryColor)
        .text('.ONLINE', centerX - 50, currentY, { width: 100, align: 'center' });

      // Title - სერტიფიკატი in large red text
      currentY += 50;
      doc.fontSize(42)
        .fillColor(accentColor)
        .font('Helvetica-Bold')
        .text('სერტიფიკატი', centerX - 200, currentY, { width: 400, align: 'center' });

      // Introductory phrase - ადასტურებს, რომ
      currentY += 50;
      doc.fontSize(14)
        .fillColor(primaryColor)
        .font('Helvetica')
        .text('ადასტურებს, რომ', centerX - 150, currentY, { width: 300, align: 'center' });

      // Student Name - Large bold dark blue
      currentY += 35;
      doc.fontSize(32)
        .fillColor(primaryColor)
        .font('Helvetica-Bold')
        .text(data.studentName, centerX - 250, currentY, { width: 500, align: 'center' });

      // Completion statement
      currentY += 50;
      doc.fontSize(13)
        .fillColor(primaryColor)
        .font('Helvetica')
        .text('წარმატებით დაასრულა ონლაინ პროგრამა, პლატფორმა', centerX - 250, currentY, { width: 500, align: 'center' });
      
      currentY += 20;
      doc.fontSize(13)
        .fillColor(primaryColor)
        .font('Helvetica-Bold')
        .text('Kursebi.Online-ზე', centerX - 150, currentY, { width: 300, align: 'center' });

      // Course Title - Large red text
      currentY += 40;
      doc.fontSize(28)
        .fillColor(accentColor)
        .font('Helvetica-Bold')
        .text(data.courseTitle, centerX - 300, currentY, { width: 600, align: 'center' });

      // Footer - Date and ID
      const footerY = pageHeight - 80;

      // Date on left
      doc.fontSize(11)
        .fillColor(primaryColor)
        .font('Helvetica')
        .text('თარიღი:', 80, footerY);
      
      doc.fontSize(11)
        .fillColor(primaryColor)
        .font('Helvetica')
        .text(formatGeorgianDate(data.issuedAt), 80, footerY + 18);

      // ID on right
      doc.fontSize(11)
        .fillColor(primaryColor)
        .font('Helvetica')
        .text('ID:', pageWidth - 200, footerY, { align: 'right' });
      
      doc.fontSize(11)
        .fillColor(primaryColor)
        .font('Courier')
        .text(data.certificateNumber, pageWidth - 80, footerY + 18, { align: 'right' });

      // Finalize PDF
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
