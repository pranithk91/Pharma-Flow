"""
Authentication utilities for JWT-based authentication
"""

import jwt
import os
from datetime import datetime, timedelta
from functools import wraps
from flask import request, jsonify

# Get JWT secret from environment or use a default (should be changed in production)
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-this-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24


def generate_token(username: str) -> str:
    """
    Generate a JWT token for the given username
    
    Args:
        username: The username to encode in the token
        
    Returns:
        JWT token string
    """
    payload = {
        "username": username,
        "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS),
        "iat": datetime.utcnow()
    }
    
    token = jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    return token


def verify_token(token: str) -> dict:
    """
    Verify and decode a JWT token
    
    Args:
        token: JWT token string
        
    Returns:
        Decoded token payload
        
    Raises:
        jwt.ExpiredSignatureError: If token has expired
        jwt.InvalidTokenError: If token is invalid
    """
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise ValueError("Token has expired")
    except jwt.InvalidTokenError:
        raise ValueError("Invalid token")


def token_required(f):
    """
    Decorator to protect API endpoints with JWT authentication
    
    Usage:
        @app.route('/api/protected')
        @token_required
        def protected_route(current_user):
            return jsonify({'message': f'Hello {current_user}'})
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = None
        
        # Get token from Authorization header
        auth_header = request.headers.get('Authorization')
        
        if auth_header:
            try:
                # Expected format: "Bearer <token>"
                token = auth_header.split(" ")[1]
            except IndexError:
                return jsonify({'error': 'Invalid authorization header format'}), 401
        
        if not token:
            return jsonify({'error': 'Authentication token is missing'}), 401
        
        try:
            # Verify token and get username
            payload = verify_token(token)
            current_user = payload['username']
        except ValueError as e:
            return jsonify({'error': str(e)}), 401
        except Exception as e:
            return jsonify({'error': 'Token verification failed'}), 401
        
        # Pass current_user to the route function
        return f(current_user=current_user, *args, **kwargs)
    
    return decorated_function


def get_current_user_from_token() -> str:
    """
    Extract username from the current request's JWT token
    
    Returns:
        Username from token or None if no valid token
    """
    token = None
    auth_header = request.headers.get('Authorization')
    
    if auth_header:
        try:
            token = auth_header.split(" ")[1]
            payload = verify_token(token)
            return payload['username']
        except (IndexError, ValueError):
            return None
    
    return None

