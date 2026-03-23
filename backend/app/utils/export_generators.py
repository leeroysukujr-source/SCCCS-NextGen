
import io
import os
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.oxml.ns import qn

def generate_pdf_report(data, title="System Report"):
    """
    Generate a professional PDF report with branding colors and layout.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    elements = []
    
    # Styles
    styles = getSampleStyleSheet()
    
    # Custom Title Style
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Title'],
        fontSize=24,
        textColor=colors.HexColor('#4f46e5'), # Indigo-600
        spaceAfter=30
    )
    
    # Header
    elements.append(Paragraph(title, title_style))
    elements.append(Paragraph(f"Generated on {datetime.now().strftime('%B %d, %Y')}", styles['Normal']))
    elements.append(Spacer(1, 20))
    
    # Executive Summary (Overview)
    elements.append(Paragraph("Executive Summary", styles['Heading2']))
    
    overview = data.get('overview', {})
    summary_data = [
        ['Metric', 'Value'],
        ['Total Users', str(overview.get('total_users', 0))],
        ['Active Users', str(overview.get('active_users', 0))],
        ['Workspaces', str(overview.get('total_workspaces', 0))]
    ]
    
    t = Table(summary_data, colWidths=[200, 100])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (1, 0), colors.HexColor('#e0e7ff')),
        ('TEXTCOLOR', (0, 0), (1, 0), colors.HexColor('#3730a3')),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e5e7eb')),
    ]))
    elements.append(t)
    elements.append(Spacer(1, 20))
    
    # Detailed User List (Top 50 rows)
    elements.append(Paragraph("User Data Detail", styles['Heading2']))
    
    # Prepare table data
    table_data = [['ID', 'Name', 'Email', 'Role', 'Status']]
    users = data.get('details', [])
    for u in users[:50]: # Limit for PDF
        table_data.append([
            str(u.get('id', '')),
            u.get('first_name', '') + ' ' + u.get('last_name', ''),
            u.get('email', ''),
            u.get('role', ''),
            'Active' if u.get('is_active') else 'Inactive'
        ])
        
    t2 = Table(table_data, colWidths=[30, 120, 150, 80, 60])
    t2.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1f2937')), # Slate-800
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.whitesmoke, colors.HexColor('#f3f4f6')]),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#d1d5db')),
    ]))
    elements.append(t2)
    
    doc.build(elements)
    buffer.seek(0)
    return buffer

def generate_excel_report(data, title="System Report"):
    """
    Generate a styled Excel report.
    """
    wb = Workbook()
    ws = wb.active
    ws.title = "Overview"
    
    # Styling
    header_font = Font(bold=True, color="FFFFFF", size=12)
    header_fill = PatternFill(start_color="4F46E5", end_color="4F46E5", fill_type="solid")
    
    # 1. Overview Sheet
    ws.append(["Metric", "Value"])
    overview = data.get('overview', {})
    ws.append(["Total Users", overview.get('total_users', 0)])
    ws.append(["Active Users", overview.get('active_users', 0)])
    ws.append(["Total Students", overview.get('total_students', 0)])
    ws.append(["Total Teachers", overview.get('total_teachers', 0)])
    
    for cell in ws[1]:
        cell.font = header_font
        cell.fill = header_fill
        
    # 2. Details Sheet
    ws2 = wb.create_sheet("Detailed Data")
    headers = ['ID', 'Username', 'Email', 'Full Name', 'Role', 'Status', 'Joined']
    ws2.append(headers)
    
    for cell in ws2[1]:
        cell.font = header_font
        cell.fill = header_fill
        
    users = data.get('details', [])
    for u in users:
        ws2.append([
            u.get('id'),
            u.get('username'),
            u.get('email'),
            f"{u.get('first_name','')} {u.get('last_name','')}",
            u.get('role'),
            'Active' if u.get('is_active') else 'Inactive',
            u.get('created_at')
        ])
    
    # Auto-width
    for sheet in [ws, ws2]:
        for column in sheet.columns:
            max_length = 0
            column_letter = column[0].column_letter
            for cell in column:
                try:
                    if len(str(cell.value)) > max_length:
                        max_length = len(str(cell.value))
                except: pass
            sheet.column_dimensions[column_letter].width = min(max_length + 2, 50)
            
    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    return output

def generate_word_report(data, title="System Report"):
    """
    Generate a Word document report.
    """
    doc = Document()
    
    # Title
    heading = doc.add_heading(title, 0)
    heading.alignment = 1 # Center
    
    doc.add_paragraph(f"Generated on {datetime.now().strftime('%B %d, %Y')}")
    
    # Overview
    doc.add_heading('Executive Summary', level=1)
    overview = data.get('overview', {})
    
    table = doc.add_table(rows=1, cols=2)
    table.style = 'Light Shading Accent 1'
    hdr_cells = table.rows[0].cells
    hdr_cells[0].text = 'Metric'
    hdr_cells[1].text = 'Value'
    
    metrics = [
        ('Total Users', overview.get('total_users', 0)),
        ('Active Recently', overview.get('active_users', 0)),
        ('Total Workspaces', overview.get('total_workspaces', 0))
    ]
    
    for metric, value in metrics:
        row_cells = table.add_row().cells
        row_cells[0].text = str(metric)
        row_cells[1].text = str(value)
        
    doc.add_paragraph('\n')
    
    # Details
    doc.add_heading('Detailed User List', level=1)
    users = data.get('details', [])
    
    table2 = doc.add_table(rows=1, cols=4)
    table2.style = 'Light List Accent 1'
    hdr_cells = table2.rows[0].cells
    hdr_cells[0].text = 'Name'
    hdr_cells[1].text = 'Email'
    hdr_cells[2].text = 'Role'
    hdr_cells[3].text = 'Status'
    
    for u in users[:100]: # Limit for Word perf
        row_cells = table2.add_row().cells
        row_cells[0].text = f"{u.get('first_name','')} {u.get('last_name','')}"
        row_cells[1].text = u.get('email', '')
        row_cells[2].text = u.get('role', '')
        row_cells[3].text = 'Active' if u.get('is_active') else 'Inactive'
        
    output = io.BytesIO()
    doc.save(output)
    output.seek(0)
    return output
