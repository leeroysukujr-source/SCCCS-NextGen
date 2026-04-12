import google.generativeai as genai
from flask import current_app
from app import db
from app.models import Message, Channel, User
from config import Config
import json

class MeetingAIService:
    @staticmethod
    def generate_after_action_report(room_id, transcription_text):
        """
        Generates a summary using Gemini Pro 1.5 and posts it to the channel.
        """
        if not Config.GEMINI_API_KEY or not transcription_text:
            return None
            
        genai.configure(api_key=Config.GEMINI_API_KEY)
        model = genai.GenerativeModel('gemini-1.5-pro')
        
        prompt = f"""
        Analyze the following meeting transcription and generate a professional After-Action Report (AAR) in Markdown format.
        
        Transcription:
        {transcription_text}
        
        The report must include:
        1. Key Topics Discussed
        2. Action Items (with owners if mentioned)
        3. Attendance Summary
        4. Decisions Made
        
        Formatting: Use clean Markdown headers and bullet points.
        """
        
        try:
            response = model.generate_content(prompt)
            report_md = response.text
            
            # Find the channel associated with this room
            from app.models import Room
            room = Room.query.get(room_id)
            if room and room.channel_id:
                # Post the report to the channel as a system message
                new_msg = Message(
                    channel_id=room.channel_id,
                    author_id=None, # System
                    content=report_md,
                    message_type='text',
                    is_encrypted=False # System reports are public to the channel members
                )
                db.session.add(new_msg)
                db.session.commit()
                
                # Emit via Socket.IO
                try:
                    from app import socketio
                    socketio.emit('message_received', new_msg.to_dict(), room=f'channel_{room.channel_id}')
                except:
                    pass
                    
            return report_md
        except Exception as e:
            print(f"Gemini Error: {e}")
            return None

    @staticmethod
    def get_suggested_answers(workspace_id, question_text):
        """
        Searches historical messages for similar queries and suggests answers.
        """
        if not Config.GEMINI_API_KEY:
            return []
            
        # 1. Fetch historical messages from this workspace
        # We limit to last 200 messages for context window / performance
        historical_messages = Message.query.join(Channel).filter(
            Channel.workspace_id == workspace_id,
            Message.message_type == 'text'
        ).order_by(Message.created_at.desc()).limit(200).all()
        
        context = "\n".join([f"User {m.author_id}: {m.content}" for m in historical_messages if m.content])
        
        genai.configure(api_key=Config.GEMINI_API_KEY)
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        prompt = f"""
        You are an AI Teaching Assistant. Based on the following historical chat history, provide suggest answers for the new student question.
        
        History:
        {context}
        
        Question:
        {question_text}
        
        If no relevant answer is found in history, state that no historical context exists.
        Suggest the 3 best historical answers or a synthesized one.
        """
        
        try:
            response = model.generate_content(prompt)
            return response.text
        except Exception:
            return "Unable to generate suggestions at this time."
