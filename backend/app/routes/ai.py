from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import User
from config import Config
import requests
import json

ai_bp = Blueprint('ai', __name__)

def offline_ai_analyze(text):
    """Simple offline AI analysis using keyword matching and basic NLP"""
    # This is a placeholder for offline AI - in production, you'd use a local model
    keywords = {
        'question': ['?', 'what', 'how', 'why', 'when', 'where', 'who'],
        'urgent': ['urgent', 'asap', 'immediately', 'important'],
        'positive': ['good', 'great', 'excellent', 'thanks', 'thank you', 'awesome'],
        'negative': ['bad', 'problem', 'issue', 'error', 'failed', 'broken']
    }
    
    text_lower = text.lower()
    analysis = {
        'sentiment': 'neutral',
        'keywords_found': [],
        'suggestions': []
    }
    
    for category, words in keywords.items():
        for word in words:
            if word in text_lower:
                analysis['keywords_found'].append(word)
                if category == 'positive':
                    analysis['sentiment'] = 'positive'
                elif category == 'negative':
                    analysis['sentiment'] = 'negative'
                elif category == 'question':
                    analysis['suggestions'].append('This appears to be a question. Consider providing a detailed answer.')
                elif category == 'urgent':
                    analysis['suggestions'].append('This message appears urgent. Consider prioritizing a response.')
    
    return analysis

def online_ai_analyze(text, task='analyze'):
    """Online AI analysis using OpenAI API"""
    if not Config.ONLINE_AI_ENABLED or not Config.OPENAI_API_KEY:
        return {'error': 'Online AI not available'}
    
    try:
        headers = {
            'Authorization': f'Bearer {Config.OPENAI_API_KEY}',
            'Content-Type': 'application/json'
        }
        
        prompt = f"Analyze the following text and provide insights: {text}"
        if task == 'summarize':
            prompt = f"Summarize the following text: {text}"
        elif task == 'suggest':
            prompt = f"Provide suggestions for the following text: {text}"
        
        data = {
            'model': 'gpt-3.5-turbo',
            'messages': [
                {'role': 'system', 'content': 'You are a helpful assistant for an educational collaboration platform.'},
                {'role': 'user', 'content': prompt}
            ],
            'max_tokens': 200
        }
        
        response = requests.post(
            'https://api.openai.com/v1/chat/completions',
            headers=headers,
            json=data,
            timeout=10
        )
        
        if response.status_code == 200:
            result = response.json()
            return {
                'analysis': result['choices'][0]['message']['content'],
                'model': 'gpt-3.5-turbo'
            }
        else:
            return {'error': 'AI service unavailable'}
    except Exception as e:
        return {'error': str(e)}

@ai_bp.route('/analyze', methods=['POST'])
@jwt_required()
def analyze_text():
    current_user_id = get_jwt_identity()
    data = request.get_json()
    
    text = data.get('text', '')
    mode = data.get('mode', 'hybrid')  # hybrid, offline, online
    
    if not text:
        return jsonify({'error': 'No text provided'}), 400
    
    result = {}
    
    if mode in ['hybrid', 'offline'] and Config.OFFLINE_AI_ENABLED:
        result['offline'] = offline_ai_analyze(text)
    
    if mode in ['hybrid', 'online'] and Config.ONLINE_AI_ENABLED:
        result['online'] = online_ai_analyze(text, data.get('task', 'analyze'))
    
    return jsonify(result), 200

@ai_bp.route('/summarize', methods=['POST'])
@jwt_required()
def summarize_text():
    current_user_id = get_jwt_identity()
    data = request.get_json()
    
    text = data.get('text', '')
    
    if not text:
        return jsonify({'error': 'No text provided'}), 400
    
    if Config.ONLINE_AI_ENABLED:
        result = online_ai_analyze(text, 'summarize')
        return jsonify(result), 200
    else:
        # Fallback to simple offline summary
        sentences = text.split('.')
        summary = '. '.join(sentences[:3]) + '.'
        return jsonify({'summary': summary, 'mode': 'offline'}), 200

@ai_bp.route('/suggest', methods=['POST'])
@jwt_required()
def get_suggestions():
    current_user_id = get_jwt_identity()
    data = request.get_json()
    
    text = data.get('text', '')
    context = data.get('context', '')
    
    if not text:
        return jsonify({'error': 'No text provided'}), 400
    
    if Config.ONLINE_AI_ENABLED:
        full_text = f"Context: {context}\n\nText: {text}" if context else text
        result = online_ai_analyze(full_text, 'suggest')
        return jsonify(result), 200
    else:
        # Fallback to offline suggestions
        offline_result = offline_ai_analyze(text)
        return jsonify({'suggestions': offline_result.get('suggestions', []), 'mode': 'offline'}), 200

@ai_bp.route('/status', methods=['GET'])
@jwt_required()
def get_ai_status():
    return jsonify({
        'offline_enabled': Config.OFFLINE_AI_ENABLED,
        'online_enabled': Config.ONLINE_AI_ENABLED,
        'mode': Config.AI_MODE,
        'online_configured': bool(Config.OPENAI_API_KEY)
    }), 200

