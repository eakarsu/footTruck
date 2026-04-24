const { Parser } = require('json2csv');
const PDFDocument = require('pdfkit');

function sendCSV(res, data, fields, filename) {
  const parser = new Parser({ fields });
  const csv = parser.parse(data);
  res.header('Content-Type', 'text/csv');
  res.header('Content-Disposition', `attachment; filename="${filename}.csv"`);
  res.send(csv);
}

function sendPDF(res, title, columns, rows, filename) {
  const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });

  res.header('Content-Type', 'application/pdf');
  res.header('Content-Disposition', `attachment; filename="${filename}.pdf"`);
  doc.pipe(res);

  // Title
  doc.fontSize(18).font('Helvetica-Bold').text(title, { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(10).font('Helvetica').text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
  doc.moveDown(1);

  // Table header
  const tableTop = doc.y;
  const colWidth = (doc.page.width - 80) / columns.length;

  doc.fontSize(9).font('Helvetica-Bold');
  columns.forEach((col, i) => {
    doc.text(col, 40 + i * colWidth, tableTop, { width: colWidth, align: 'left' });
  });

  doc.moveTo(40, tableTop + 15).lineTo(doc.page.width - 40, tableTop + 15).stroke();
  let y = tableTop + 20;

  // Table rows
  doc.font('Helvetica').fontSize(8);
  rows.forEach((row) => {
    if (y > doc.page.height - 60) {
      doc.addPage();
      y = 40;
    }
    row.forEach((cell, i) => {
      doc.text(String(cell ?? ''), 40 + i * colWidth, y, { width: colWidth, align: 'left' });
    });
    y += 15;
  });

  doc.end();
}

module.exports = { sendCSV, sendPDF };
