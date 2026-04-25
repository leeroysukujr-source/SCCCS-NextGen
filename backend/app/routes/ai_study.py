from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import User, File, Lesson, Class
from config import Config
import requests
import json
import os
import PyPDF2
from docx import Document
import io
from app.utils.middleware import feature_required

ai_study_bp = Blueprint('ai_study', __name__)


def log_ai_action(user_id, action, resource_type=None, resource_id=None, metadata=None):
    try:
        from app.models.security import AuditLog
        from app.models import User
        user = User.query.get(user_id)
        log = AuditLog(
            user_id=user_id,
            action=f"AI_{action.upper()}",
            resource_type=resource_type or 'ai_hub',
            resource_id=resource_id,
            workspace_id=user.workspace_id if user else None,
            details_data=json.dumps(metadata) if metadata else None
        )
        db.session.add(log)
        db.session.commit()
    except Exception as e:
        print(f"Failed to log AI action: {e}")

@ai_study_bp.before_request
@feature_required('study_hub')
def check_study_hub_enabled():
    pass

def extract_text_from_pdf(file_path):
    """Extract text from PDF file"""
    try:
        with open(file_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            text = ""
            for page in pdf_reader.pages:
                text += page.extract_text() + "\n"
            return text
    except Exception as e:
        print(f"Error extracting PDF text: {e}")
        return None

def extract_text_from_docx(file_path):
    """Extract text from DOCX file"""
    try:
        doc = Document(file_path)
        text = ""
        for paragraph in doc.paragraphs:
            text += paragraph.text + "\n"
        return text
    except Exception as e:
        print(f"Error extracting DOCX text: {e}")
        return None

def extract_text_from_file(file_obj):
    """Extract text from various file types"""
    if not file_obj or not os.path.exists(file_obj.file_path):
        return None
    
    mime_type = file_obj.mime_type or ''
    file_path = file_obj.file_path
    
    if 'pdf' in mime_type or file_path.lower().endswith('.pdf'):
        return extract_text_from_pdf(file_path)
    elif 'word' in mime_type or 'document' in mime_type or file_path.lower().endswith(('.docx', '.doc')):
        return extract_text_from_docx(file_path)
    elif 'text' in mime_type or file_path.lower().endswith(('.txt', '.md')):
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return f.read()
        except:
            return None
    else:
        return None

def call_gemini_api(prompt, context=None, file_text=None, task='chat', lesson_info=None, class_info=None):
    """Call Google Gemini API with enhanced context awareness"""
    if not Config.GEMINI_API_KEY:
        return {'error': 'Gemini API key not configured'}
    
    try:
        # Build comprehensive system prompt with course context
        system_prompt_parts = [
            "You are an expert educational AI assistant specializing in academic instruction and student support.",
            "Your role is to provide comprehensive, detailed, and professionally structured educational responses.",
            "",
            "CRITICAL RESPONSE FORMATTING RULES:",
            "1. NEVER use markdown formatting symbols like asterisks (*), underscores (_), or backticks (`) in your responses",
            "2. NEVER use markdown headers (#), bold (**), or italic (*) formatting",
            "3. Use plain text with clear structure: paragraphs, line breaks, and natural language emphasis",
            "4. For lists, use simple dashes (-) or numbers (1., 2., 3.) without markdown symbols",
            "5. Write in a natural, conversational yet professional academic tone",
            "6. Format responses as clean, readable text that looks professional and modern",
            "",
            "RESPONSE CONTENT GUIDELINES:",
            "1. Always provide thorough, well-structured explanations that go beyond surface-level answers",
            "2. Use clear, professional academic language appropriate for the course level",
            "3. Include relevant examples, analogies, and real-world applications when helpful",
            "4. Break down complex concepts into digestible parts with logical progression",
            "5. When referencing course materials, cite specific sections or concepts naturally",
            "6. Encourage deeper understanding by connecting concepts to broader course themes",
            "7. Structure content with clear paragraphs and logical flow",
            ""
        ]
        
        # Add course and lesson context
        if class_info or lesson_info:
            system_prompt_parts.append("CURRENT COURSE CONTEXT:")
            if class_info:
                if isinstance(class_info, dict):
                    system_prompt_parts.append(f"• Course Name: {class_info.get('name', 'N/A')}")
                    system_prompt_parts.append(f"• Course Code: {class_info.get('code', 'N/A')}")
                    if class_info.get('description'):
                        system_prompt_parts.append(f"• Course Description: {class_info.get('description')}")
                else:
                    system_prompt_parts.append(f"• Course: {class_info}")
            
            if lesson_info:
                if isinstance(lesson_info, dict):
                    system_prompt_parts.append(f"• Current Lesson: {lesson_info.get('title', 'N/A')}")
                    if lesson_info.get('description'):
                        system_prompt_parts.append(f"• Lesson Description: {lesson_info.get('description')}")
                    if lesson_info.get('content'):
                        system_prompt_parts.append(f"• Lesson Content: {lesson_info.get('content')[:500]}")
                else:
                    system_prompt_parts.append(f"• Lesson: {lesson_info}")
            system_prompt_parts.append("")
        
        # Add additional context if provided
        if context:
            system_prompt_parts.append(f"ADDITIONAL CONTEXT:\n{context}\n")
        
        system_prompt = "\n".join(system_prompt_parts)
        
        # Add file text if provided
        if file_text:
            file_content_section = f"""
DOCUMENT CONTENT (Course Material):
{'=' * 60}
{file_text[:50000]}
{'=' * 60}

STUDENT REQUEST/QUESTION:
{prompt}

Please provide a comprehensive, detailed response that:
- Directly addresses the student's question using information from the document
- Explains concepts thoroughly with examples from the material
- Connects the answer to the broader course context when relevant
- Uses professional academic language and proper formatting
"""
            full_prompt = f"{system_prompt}\n{file_content_section}"
        else:
            full_prompt = f"{system_prompt}\n\nSTUDENT REQUEST/QUESTION:\n{prompt}\n\nPlease provide a comprehensive, detailed response."
        
        # Prepare request - Try v1 API first, fallback to v1beta
        model_name = Config.GEMINI_MODEL
        payload = {
            "contents": [{
                "parts": [{
                    "text": full_prompt
                }]
            }]
        }
        
        # Add generation config for better, more detailed responses
        generation_config = {
            "temperature": 0.7,
            "topK": 40,
            "topP": 0.95,
            "maxOutputTokens": 4096,  # Increased for more detailed responses
        }
        payload["generationConfig"] = generation_config
        
        # Try v1 API first (for newer models like gemini-1.5-flash, gemini-1.5-pro)
        urls_to_try = [
            f"https://generativelanguage.googleapis.com/v1/models/{model_name}:generateContent?key={Config.GEMINI_API_KEY}",
            f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={Config.GEMINI_API_KEY}"
        ]
        
        last_error = None
        for url in urls_to_try:
            try:
                response = requests.post(url, json=payload, timeout=30)
                
                if response.status_code == 200:
                    result = response.json()
                    if 'candidates' in result and len(result['candidates']) > 0:
                        content = result['candidates'][0]['content']['parts'][0]['text']
                        
                        # Clean up markdown formatting to make it more professional
                        import re
                        # Remove markdown bold/italic
                        content = re.sub(r'\*\*([^*]+)\*\*', r'\1', content)  # Remove **bold**
                        content = re.sub(r'\*([^*]+)\*', r'\1', content)  # Remove *italic*
                        content = re.sub(r'__([^_]+)__', r'\1', content)  # Remove __bold__
                        content = re.sub(r'_([^_]+)_', r'\1', content)  # Remove _italic_
                        # Remove markdown headers
                        content = re.sub(r'^#{1,6}\s+', '', content, flags=re.MULTILINE)
                        # Remove markdown code blocks
                        content = re.sub(r'```[\s\S]*?```', '', content)
                        content = re.sub(r'`([^`]+)`', r'\1', content)
                        # Clean up extra whitespace
                        content = re.sub(r'\n{3,}', '\n\n', content)
                        content = content.strip()
                        
                        return {
                            'response': content,
                            'model': Config.GEMINI_MODEL,
                            'success': True
                        }
                    else:
                        return {'error': 'No response from Gemini API'}
                else:
                    error_data = response.text
                    last_error = error_data
                    # If 404, try next URL; otherwise return error
                    if response.status_code != 404:
                        return {'error': f'Gemini API error: {error_data}'}
            except Exception as e:
                last_error = str(e)
                continue
        
        # If all URLs failed, return the last error
        return {'error': f'Gemini API error: {last_error}'}
    
    except Exception as e:
        return {'error': f'Error calling Gemini API: {str(e)}'}

@ai_study_bp.route('/chat', methods=['POST'])
@jwt_required()
def study_chat():
    """AI study assistant chat endpoint with enhanced context and all course materials"""
    current_user_id = get_jwt_identity()
    data = request.get_json()
    
    prompt = data.get('prompt', '')
    file_id = data.get('file_id')
    lesson_id = data.get('lesson_id')
    context = data.get('context', '')
    uploaded_file_text = data.get('uploaded_file_text')  # Text from user-uploaded file
    
    if not prompt:
        return jsonify({'error': 'Prompt is required'}), 400
    
    # Get comprehensive lesson and class context
    lesson_info = None
    class_info = None
    course_context = context
    all_materials_text = []
    
    if lesson_id:
        lesson = Lesson.query.get(lesson_id)
        if lesson:
            lesson_info = {
                'id': lesson.id,
                'title': lesson.title,
                'description': lesson.description,
                'content': lesson.content,
                'class_id': lesson.class_id
            }
            
            # Get ALL course materials for this lesson
            lesson_files = File.query.filter_by(lesson_id=lesson_id).all()
            for file_obj in lesson_files:
                file_text = extract_text_from_file(file_obj)
                if file_text:
                    all_materials_text.append({
                        'filename': file_obj.original_filename or file_obj.filename,
                        'text': file_text
                    })
            
            # Get class information
            class_obj = Class.query.get(lesson.class_id)
            if class_obj:
                class_info = {
                    'id': class_obj.id,
                    'name': class_obj.name,
                    'code': class_obj.code,
                    'description': class_obj.description
                }
                
                # Build comprehensive context with all materials
                materials_section = ""
                if all_materials_text:
                    materials_section = "\n\nCOURSE MATERIALS AVAILABLE:\n"
                    for i, material in enumerate(all_materials_text, 1):
                        materials_section += f"\nMaterial {i}: {material['filename']}\n"
                        materials_section += f"Content Preview: {material['text'][:500]}...\n"
                
                course_context = f"""Course Information:
- Course Name: {class_obj.name}
- Course Code: {class_obj.code}
- Course Description: {class_obj.description or 'N/A'}

Current Lesson:
- Lesson Title: {lesson.title}
- Lesson Description: {lesson.description or 'N/A'}
- Lesson Content: {lesson.content[:1000] if lesson.content else 'N/A'}{materials_section}

{context}"""
    
    # Get specific file text if file_id provided (in addition to all materials)
    file_text = None
    if file_id:
        file_obj = File.query.get(file_id)
        if file_obj:
            file_text = extract_text_from_file(file_obj)
    
    # Combine all file texts
    combined_file_text = ""
    if all_materials_text:
        combined_file_text = "\n\n".join([
            f"=== {mat['filename']} ===\n{mat['text']}" 
            for mat in all_materials_text
        ])
    
    # Add specific file if provided and not already in materials
    if file_text and file_id:
        file_obj = File.query.get(file_id)
        if file_obj:
            filename = file_obj.original_filename or file_obj.filename
            # Check if this file is already in materials
            if not any(mat['filename'] == filename for mat in all_materials_text):
                combined_file_text += f"\n\n=== {filename} ===\n{file_text}"
    
    # Add uploaded file text if provided
    if uploaded_file_text:
        combined_file_text += f"\n\n=== User Uploaded Content ===\n{uploaded_file_text}"
    
    # Use combined text (limit to 50000 chars to avoid token limits)
    final_file_text = combined_file_text[:50000] if combined_file_text else None
    
    # Call Gemini API with full context and all materials
    result = call_gemini_api(
        prompt, 
        context=course_context, 
        file_text=final_file_text,
        lesson_info=lesson_info,
        class_info=class_info
    )
    
    if 'error' in result:
        return jsonify(result), 500
    
    log_ai_action(current_user_id, 'chat', 'file' if file_id else 'lesson', file_id or lesson_id, {'prompt': prompt[:100]})
    return jsonify(result), 200


@ai_study_bp.route('/upload-file', methods=['POST'])
@jwt_required()
def upload_file_for_ai():
    """Upload a file for AI processing"""
    current_user_id = get_jwt_identity()
    
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    # Save file temporarily
    from werkzeug.utils import secure_filename
    import tempfile
    import os
    
    filename = secure_filename(file.filename)
    temp_dir = tempfile.gettempdir()
    temp_path = os.path.join(temp_dir, f"ai_upload_{current_user_id}_{filename}")
    
    try:
        file.save(temp_path)
        
        # Extract text from file
        file_text = None
        mime_type = file.content_type or ''
        
        if 'pdf' in mime_type or filename.lower().endswith('.pdf'):
            file_text = extract_text_from_pdf(temp_path)
        elif 'word' in mime_type or 'document' in mime_type or filename.lower().endswith(('.docx', '.doc')):
            file_text = extract_text_from_docx(temp_path)
        elif 'text' in mime_type or filename.lower().endswith(('.txt', '.md')):
            try:
                with open(temp_path, 'r', encoding='utf-8') as f:
                    file_text = f.read()
            except:
                pass
        
        # Clean up temp file
        if os.path.exists(temp_path):
            os.remove(temp_path)
        
        if file_text is None:
            return jsonify({'error': 'Could not extract text from this file type. Supported: PDF, DOCX, TXT'}), 400
        
        return jsonify({
            'text': file_text,
            'filename': filename,
            'size': len(file_text)
        }), 200
        
    except Exception as e:
        # Clean up on error
        if os.path.exists(temp_path):
            os.remove(temp_path)
        return jsonify({'error': f'Error processing file: {str(e)}'}), 500

@ai_study_bp.route('/extract-text/<int:file_id>', methods=['GET'])
@jwt_required()
def extract_file_text(file_id):
    """Extract text from a file for AI processing"""
    current_user_id = get_jwt_identity()
    file_obj = File.query.get(file_id)
    
    if not file_obj:
        return jsonify({'error': 'File not found'}), 404
    
    # Check if user has access to this file
    if file_obj.lesson_id:
        lesson = Lesson.query.get(file_obj.lesson_id)
        if lesson:
            class_obj = Class.query.get(lesson.class_id)
            if class_obj:
                from app.models import ClassMember
                user = User.query.get(current_user_id)
                # Students can access all classes
                if user.role != 'student':
                    member = ClassMember.query.filter_by(class_id=class_obj.id, user_id=current_user_id).first()
                    if not member and class_obj.teacher_id != current_user_id:
                        return jsonify({'error': 'Access denied'}), 403
    
    text = extract_text_from_file(file_obj)
    
    if text is None:
        return jsonify({'error': 'Could not extract text from this file type'}), 400
    
    return jsonify({
        'text': text,
        'file_id': file_id,
        'file_name': file_obj.original_filename
    }), 200

@ai_study_bp.route('/generate-notes', methods=['POST'])
@jwt_required()
def generate_study_notes():
    """Generate study notes from all course materials"""
    current_user_id = get_jwt_identity()
    data = request.get_json()
    
    file_id = data.get('file_id')
    lesson_id = data.get('lesson_id')
    focus_areas = data.get('focus_areas', [])
    uploaded_file_text = data.get('uploaded_file_text')
    
    if not file_id and not lesson_id:
        return jsonify({'error': 'File ID or Lesson ID is required'}), 400
    
    # Get ALL course materials if lesson_id provided
    all_materials_text = []
    lesson_info = None
    class_info = None
    context = ""
    
    if lesson_id:
        lesson = Lesson.query.get(lesson_id)
        if lesson:
            lesson_info = {
                'id': lesson.id,
                'title': lesson.title,
                'description': lesson.description,
                'content': lesson.content
            }
            
            # Get ALL course materials for this lesson
            lesson_files = File.query.filter_by(lesson_id=lesson_id).all()
            for file_obj in lesson_files:
                file_text = extract_text_from_file(file_obj)
                if file_text:
                    all_materials_text.append({
                        'filename': file_obj.original_filename or file_obj.filename,
                        'text': file_text
                    })
            
            class_obj = Class.query.get(lesson.class_id)
            if class_obj:
                class_info = {
                    'id': class_obj.id,
                    'name': class_obj.name,
                    'code': class_obj.code,
                    'description': class_obj.description
                }
                context = f"Course: {class_obj.name}\nLesson: {lesson.title}\nDescription: {lesson.description or ''}"
    
    # Get specific file if provided
    if file_id:
        file_obj = File.query.get(file_id)
        if file_obj:
            file_text = extract_text_from_file(file_obj)
            if file_text:
                filename = file_obj.original_filename or file_obj.filename
                if not any(mat['filename'] == filename for mat in all_materials_text):
                    all_materials_text.append({
                        'filename': filename,
                        'text': file_text
                    })
    
    # Combine all materials
    combined_file_text = "\n\n".join([
        f"=== {mat['filename']} ===\n{mat['text']}" 
        for mat in all_materials_text
    ])
    
    if uploaded_file_text:
        combined_file_text += f"\n\n=== User Uploaded Content ===\n{uploaded_file_text}"
    
    final_file_text = combined_file_text[:50000] if combined_file_text else None
    
    # Create prompt for note generation
    focus_text = f"\nFocus on: {', '.join(focus_areas)}" if focus_areas else ""
    prompt = f"""Generate comprehensive, well-structured study notes from all the course materials provided. 
Create detailed, professional notes with:
1. Key concepts and definitions with clear explanations
2. Important points and examples with context
3. Summary of main topics organized by theme
4. Key takeaways and connections to course material
5. Important formulas, dates, or facts if applicable

{focus_text}

Provide notes in a clear, hierarchical format that facilitates learning and review. Use plain text formatting without markdown symbols."""
    
    result = call_gemini_api(prompt, context=context, file_text=final_file_text, task='notes', lesson_info=lesson_info, class_info=class_info)
    
    if 'error' in result:
        return jsonify(result), 500
    
    log_ai_action(current_user_id, 'generate_notes', 'lesson', lesson_id, {'focus': focus_areas})
    return jsonify(result), 200


@ai_study_bp.route('/generate-quiz', methods=['POST'])
@jwt_required()
def generate_quiz():
    """Generate quiz questions from all course materials"""
    current_user_id = get_jwt_identity()
    data = request.get_json()
    
    file_id = data.get('file_id')
    lesson_id = data.get('lesson_id')
    num_questions = data.get('num_questions', 10)
    difficulty = data.get('difficulty', 'medium')  # easy, medium, hard
    uploaded_file_text = data.get('uploaded_file_text')
    
    if not file_id and not lesson_id:
        return jsonify({'error': 'File ID or Lesson ID is required'}), 400
    
    # Get ALL course materials if lesson_id provided
    all_materials_text = []
    lesson_info = None
    class_info = None
    context = ""
    
    if lesson_id:
        lesson = Lesson.query.get(lesson_id)
        if lesson:
            lesson_info = {
                'id': lesson.id,
                'title': lesson.title,
                'description': lesson.description,
                'content': lesson.content
            }
            
            # Get ALL course materials for this lesson
            lesson_files = File.query.filter_by(lesson_id=lesson_id).all()
            for file_obj in lesson_files:
                file_text = extract_text_from_file(file_obj)
                if file_text:
                    all_materials_text.append({
                        'filename': file_obj.original_filename or file_obj.filename,
                        'text': file_text
                    })
            
            class_obj = Class.query.get(lesson.class_id)
            if class_obj:
                class_info = {
                    'id': class_obj.id,
                    'name': class_obj.name,
                    'code': class_obj.code,
                    'description': class_obj.description
                }
                context = f"Course: {class_obj.name}\nLesson: {lesson.title}\nDescription: {lesson.description or ''}"
    
    # Get specific file if provided
    if file_id:
        file_obj = File.query.get(file_id)
        if file_obj:
            file_text = extract_text_from_file(file_obj)
            if file_text:
                filename = file_obj.original_filename or file_obj.filename
                if not any(mat['filename'] == filename for mat in all_materials_text):
                    all_materials_text.append({
                        'filename': filename,
                        'text': file_text
                    })
    
    # Combine all materials
    combined_file_text = "\n\n".join([
        f"=== {mat['filename']} ===\n{mat['text']}" 
        for mat in all_materials_text
    ])
    
    if uploaded_file_text:
        combined_file_text += f"\n\n=== User Uploaded Content ===\n{uploaded_file_text}"
    
    final_file_text = combined_file_text[:50000] if combined_file_text else None
    
    # Create prompt for quiz generation
    prompt = f"""Generate {num_questions} {difficulty} difficulty quiz questions based on all the course materials provided.
Each question should:
- Test understanding of key concepts from the materials
- Be relevant to the course material and lesson context
- Have 4 well-constructed multiple choice options
- Include a clear, educational explanation

Format each question as JSON with:
- question: The question text (clear and specific)
- options: Array of 4 multiple choice options (one clearly correct, others plausible but incorrect)
- correct_answer: Index of correct option (0-3)
- explanation: Detailed explanation of why the answer is correct and why others are incorrect

Return as a JSON array of question objects. Use plain text in questions and explanations, no markdown formatting."""
    
    result = call_gemini_api(prompt, context=context, file_text=final_file_text, task='quiz', lesson_info=lesson_info, class_info=class_info)
    
    if 'error' in result:
        return jsonify(result), 500
    
    # Try to parse JSON from response
    try:
        # Extract JSON from markdown code blocks if present
        response_text = result.get('response', '')
        if '```json' in response_text:
            json_start = response_text.find('```json') + 7
            json_end = response_text.find('```', json_start)
            response_text = response_text[json_start:json_end].strip()
        elif '```' in response_text:
            json_start = response_text.find('```') + 3
            json_end = response_text.find('```', json_start)
            response_text = response_text[json_start:json_end].strip()
        
        questions = json.loads(response_text)
        result['questions'] = questions
    except:
        # If parsing fails, return raw response
        pass
    
    log_ai_action(current_user_id, 'generate_quiz', 'lesson', lesson_id, {'num_questions': num_questions})
    return jsonify(result), 200


@ai_study_bp.route('/summarize-document', methods=['POST'])
@jwt_required()
def summarize_document():
    """Generate summary of document"""
    current_user_id = get_jwt_identity()
    data = request.get_json()
    
    file_id = data.get('file_id')
    lesson_id = data.get('lesson_id')
    summary_type = data.get('summary_type', 'comprehensive')  # brief, comprehensive, bullet
    
    if not file_id and not lesson_id:
        return jsonify({'error': 'File ID or Lesson ID is required'}), 400
    
    # Get ALL course materials if lesson_id provided
    all_materials_text = []
    lesson_info = None
    class_info = None
    context = ""
    uploaded_file_text = data.get('uploaded_file_text')
    
    if lesson_id:
        lesson = Lesson.query.get(lesson_id)
        if lesson:
            lesson_info = {
                'id': lesson.id,
                'title': lesson.title,
                'description': lesson.description,
                'content': lesson.content
            }
            
            # Get ALL course materials for this lesson
            lesson_files = File.query.filter_by(lesson_id=lesson_id).all()
            for file_obj in lesson_files:
                file_text = extract_text_from_file(file_obj)
                if file_text:
                    all_materials_text.append({
                        'filename': file_obj.original_filename or file_obj.filename,
                        'text': file_text
                    })
            
            class_obj = Class.query.get(lesson.class_id)
            if class_obj:
                class_info = {
                    'id': class_obj.id,
                    'name': class_obj.name,
                    'code': class_obj.code,
                    'description': class_obj.description
                }
                context = f"Course: {class_obj.name}\nLesson: {lesson.title}"
    
    # Get specific file if provided
    if file_id:
        file_obj = File.query.get(file_id)
        if file_obj:
            file_text = extract_text_from_file(file_obj)
            if file_text:
                filename = file_obj.original_filename or file_obj.filename
                if not any(mat['filename'] == filename for mat in all_materials_text):
                    all_materials_text.append({
                        'filename': filename,
                        'text': file_text
                    })
    
    # Combine all materials
    combined_file_text = "\n\n".join([
        f"=== {mat['filename']} ===\n{mat['text']}" 
        for mat in all_materials_text
    ])
    
    if uploaded_file_text:
        combined_file_text += f"\n\n=== User Uploaded Content ===\n{uploaded_file_text}"
    
    final_file_text = combined_file_text[:50000] if combined_file_text else None
    
    # Create prompt for summary
    type_instructions = {
        'brief': 'Provide a concise 2-3 paragraph summary highlighting the most important points',
        'comprehensive': 'Provide a detailed, comprehensive summary covering all main points, key concepts, and important information from all materials',
        'bullet': 'Provide a well-organized bullet-point summary of key points, concepts, and takeaways'
    }
    
    prompt = f"""{type_instructions.get(summary_type, 'Provide a comprehensive summary')} of all the course materials provided.
Connect the summary to the course context when relevant. Ensure the summary is:
- Clear and well-structured
- Comprehensive yet concise
- Focused on main ideas and key concepts
- Relevant to the course and lesson context
- Uses plain text formatting without markdown symbols"""
    
    result = call_gemini_api(prompt, context=context, file_text=final_file_text, task='summarize', lesson_info=lesson_info, class_info=class_info)
    
    if 'error' in result:
        return jsonify(result), 500
    
    log_ai_action(current_user_id, 'summarize', 'file' if file_id else 'lesson', file_id or lesson_id, {'type': summary_type})
    return jsonify(result), 200


@ai_study_bp.route('/explain-concept', methods=['POST'])
@jwt_required()
def explain_concept():
    """Explain a specific concept from the document"""
    current_user_id = get_jwt_identity()
    data = request.get_json()
    
    concept = data.get('concept', '')
    file_id = data.get('file_id')
    lesson_id = data.get('lesson_id')
    level = data.get('level', 'intermediate')  # beginner, intermediate, advanced
    
    if not concept:
        return jsonify({'error': 'Concept is required'}), 400
    
    # Get ALL course materials if lesson_id provided
    all_materials_text = []
    lesson_info = None
    class_info = None
    context = ""
    uploaded_file_text = data.get('uploaded_file_text')
    
    if lesson_id:
        lesson = Lesson.query.get(lesson_id)
        if lesson:
            lesson_info = {
                'id': lesson.id,
                'title': lesson.title,
                'description': lesson.description,
                'content': lesson.content
            }
            
            # Get ALL course materials for this lesson
            lesson_files = File.query.filter_by(lesson_id=lesson_id).all()
            for file_obj in lesson_files:
                file_text = extract_text_from_file(file_obj)
                if file_text:
                    all_materials_text.append({
                        'filename': file_obj.original_filename or file_obj.filename,
                        'text': file_text
                    })
            
            class_obj = Class.query.get(lesson.class_id)
            if class_obj:
                class_info = {
                    'id': class_obj.id,
                    'name': class_obj.name,
                    'code': class_obj.code,
                    'description': class_obj.description
                }
                context = f"Course: {class_obj.name}\nLesson: {lesson.title}\nDescription: {lesson.description or ''}"
    
    # Get specific file if provided
    if file_id:
        file_obj = File.query.get(file_id)
        if file_obj:
            file_text = extract_text_from_file(file_obj)
            if file_text:
                filename = file_obj.original_filename or file_obj.filename
                if not any(mat['filename'] == filename for mat in all_materials_text):
                    all_materials_text.append({
                        'filename': filename,
                        'text': file_text
                    })
    
    # Combine all materials
    combined_file_text = "\n\n".join([
        f"=== {mat['filename']} ===\n{mat['text']}" 
        for mat in all_materials_text
    ])
    
    if uploaded_file_text:
        combined_file_text += f"\n\n=== User Uploaded Content ===\n{uploaded_file_text}"
    
    final_file_text = combined_file_text[:50000] if combined_file_text else None
    
    # Create prompt for explanation
    level_instructions = {
        'beginner': 'Explain in simple, accessible terms suitable for beginners. Use analogies and avoid jargon.',
        'intermediate': 'Provide a detailed, comprehensive explanation with examples, context, and connections to related concepts.',
        'advanced': 'Provide an in-depth, technical explanation with advanced details, methodologies, and theoretical foundations.'
    }
    
    prompt = f"""{level_instructions.get(level, 'Explain')} the concept: "{concept}"

Use all the course materials provided to give context, examples, and relevant information.
Structure your explanation to:
- Define the concept clearly
- Explain its importance and relevance to the course
- Provide examples from the materials or real-world applications
- Connect it to related concepts when applicable
- Use clear, professional academic language appropriate for {level} level

Make it comprehensive, educational, and easy to understand. Use plain text formatting without markdown symbols."""
    
    result = call_gemini_api(prompt, context=context, file_text=final_file_text, task='explain', lesson_info=lesson_info, class_info=class_info)
    
    if 'error' in result:
        return jsonify(result), 500
    
    return jsonify(result), 200

@ai_study_bp.route('/status', methods=['GET'])
@jwt_required()
def get_ai_study_status():
    """Get AI study assistant status"""
    return jsonify({
        'gemini_enabled': Config.GEMINI_ENABLED and bool(Config.GEMINI_API_KEY),
        'gemini_model': Config.GEMINI_MODEL,
        'online_ai_enabled': Config.ONLINE_AI_ENABLED
    }), 200

