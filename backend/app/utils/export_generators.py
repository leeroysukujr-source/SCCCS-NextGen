
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
    Generate a high-fidelity, professional PDF report.
    Supports dynamic sections based on the gathered snapshot data.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, 
                            rightMargin=50, leftMargin=50, 
                            topMargin=50, bottomMargin=50)
    elements = []
    
    # Styles
    styles = getSampleStyleSheet()
    
    # Define Custom Styles
    styles.add(ParagraphStyle(
        name='MainTitle',
        fontSize=28,
        textColor=colors.HexColor('#1e293b'), # Slate-800
        alignment=0,
        fontName='Helvetica-Bold',
        spaceAfter=10
    ))
    
    styles.add(ParagraphStyle(
        name='SubTitle',
        fontSize=12,
        textColor=colors.HexColor('#64748b'), # Slate-500
        alignment=0,
        spaceAfter=30
    ))
    
    styles.add(ParagraphStyle(
        name='SectionHeader',
        fontSize=18,
        textColor=colors.HexColor('#4f46e5'), # Indigo-600
        fontName='Helvetica-Bold',
        spaceBefore=25,
        spaceAfter=15,
        borderPadding=10,
        borderWidth=0,
        borderColor=colors.HexColor('#e2e8f0'),
        backColor=colors.HexColor('#f8fafc')
    ))

    # --- Header ---
    metadata = data.get('metadata', {})
    inst_name = metadata.get('institution', 'Institutional Report')
    elements.append(Paragraph(inst_name, styles['MainTitle']))
    elements.append(Paragraph(f"{title} | Generated on {datetime.now().strftime('%B %d, %Y')}", styles['SubTitle']))
    
    # --- Introduction ---
    elements.append(Paragraph("Executive Summary", styles['SectionHeader']))
    elements.append(Paragraph(f"This report provides a comprehensive overview of the institutional performance and engagement metrics as requested. Submission prepared by {metadata.get('submitted_by', 'Administrator')}.", styles['Normal']))
    elements.append(Spacer(1, 15))

    # --- Metrics Logic ---
    metrics = data.get('metrics', {})
    
    # 1. User Engagement Section
    if 'users' in metrics:
        elements.append(Paragraph("User Demographics & Enrollment", styles['SectionHeader']))
        u = metrics['users']
        user_table_data = [
            ['Metric Group', 'Count', 'Status'],
            ['Total Registered Users', str(u.get('total', 0)), 'Active'],
            ['Students', str(u.get('students', 0)), 'Enrolled'],
            ['Faculty/Teachers', str(u.get('teachers', 0)), 'Active'],
            ['Administrative Staff', str(u.get('admins', 0)), 'Active']
        ]
        
        t = Table(user_table_data, colWidths=[200, 100, 100])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#4f46e5')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('TOPPADDING', (0, 0), (-1, 0), 12),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.whitesmoke, colors.HexColor('#f8fafc')]),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
        ]))
        elements.append(t)

    # 2. Activity Trends Section
    if 'activity' in metrics:
        elements.append(Paragraph("Platform Engagement Activity", styles['SectionHeader']))
        act = metrics['activity']
        elements.append(Paragraph(f"Analysis of daily interactions indicates a robust engagement level across the digital campus.", styles['Normal']))
        elements.append(Spacer(1, 10))
        
        act_data = [
            ['Activity Type', 'Volume', 'Context'],
            ['Daily Active Users (DAU)', str(act.get('daily_active_users', 0)), 'High Usage'],
            ['System Messages Transmitted', str(act.get('messages_sent', 0)), 'Active Channels'],
            ['Collaborative Meetings held', str(act.get('meetings_held', 0)), 'Live Sessions']
        ]
        t_act = Table(act_data, colWidths=[200, 100, 100])
        t_act.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0f172a')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('TOPPADDING', (0, 0), (-1, 0), 12),
        ]))
        elements.append(t_act)

    # 3. Academic Performance
    if 'academic' in metrics:
        elements.append(Paragraph("Academic Operations & Quality", styles['SectionHeader']))
        acad = metrics['academic']
        elements.append(Paragraph(f"Operational data regarding courses and assessment throughput.", styles['Normal']))
        elements.append(Spacer(1, 10))
        
        acad_data = [
            ['Area', 'Metric', 'Performance'],
            ['Active Courses/Classes', str(acad.get('total_classes', 0)), 'Normal'],
            ['Assessment Submissions', str(acad.get('total_assignments', 0)), 'Steady'],
            ['Aggregate Performance Score', f"{acad.get('average_grade', 0)}%", 'Exceeding Target']
        ]
        t_acad = Table(acad_data, colWidths=[200, 100, 100])
        t_acad.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#059669')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('TOPPADDING', (0, 0), (-1, 0), 12),
        ]))
        elements.append(t_acad)

    # --- Footer ---
    elements.append(Spacer(1, 50))
    elements.append(Paragraph("--- End of Official Institutional Report ---", styles['SubTitle']))
    elements.append(Paragraph("SCCCS NextGen Reporting Engine v2.0 | Secure Platform Verification", styles['SubTitle']))

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
