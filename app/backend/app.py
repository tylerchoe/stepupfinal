from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from models import db, User, StepLog, Journey, Boss, UserLevel, BossAttack, BossManager, Friendship
from config import load_config, BADGE_MILESTONES, PRESET_JOURNEYS
from datetime import datetime, date, timedelta
from functools import wraps
import jwt
import os

from dotenv import load_dotenv
load_dotenv()
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

load_config(app)
db.init_app(app)

def generate_token(user_id):
    return jwt.encode({"user_id": user_id}, app.config['SECRET_KEY'], algorithm="HS256")

def decode_token(token):
    try:
        data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
        return data["user_id"]
    except:
        return None

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if token and token.startswith("Bearer "):
            token = token[7:]
        user_id = decode_token(token)
        if not user_id:
            return jsonify({'message': 'Invalid or missing token'}), 401
        current_user = User.query.get(user_id)
        return f(current_user, *args, **kwargs)
    return decorated

@app.route("/api/register", methods=["POST"])
def register():
    data = request.json
    username = data.get("username")
    password = data.get("password")

    if User.query.filter_by(username=username).first():
        return jsonify({"message": "User already exists"}), 400

    hashed_pw = generate_password_hash(password)
    user = User(username=username, password_hash=hashed_pw)
    db.session.add(user)
    db.session.commit()
    return jsonify({"message": "User created successfully"}), 201


@app.route("/api/login", methods=["POST"])
def login():
    data = request.json
    username = data.get("username")
    password = data.get("password")

    user = User.query.filter_by(username=username).first()
    if not user or not check_password_hash(user.password_hash, password):
        return jsonify({"message": "Invalid credentials"}), 401

    token = generate_token(user.id)
    return jsonify({"token": token})


@app.route("/api/user/profile", methods=["GET"])
@token_required
def profile(current_user):
    try:
        user_level = UserLevel.query.filter_by(user_id=current_user.id).first()
        if not user_level:
            user_level = UserLevel(user_id=current_user.id)
            db.session.add(user_level)
            db.session.commit()

        badges = []
        for milestone, badge_info in BADGE_MILESTONES.items():
            if current_user.total_steps_life >= milestone:
                badges.append(badge_info)

        today_steps = current_user.get_today_steps()
        streak = current_user.get_streak()
        journey_info = None
        if current_user.current_journey_id:
            journey = current_user.current_journey
            journey_info = {
                'id': journey.id,
                'start_city': journey.start_city,
                'end_city': journey.end_city,
                'total_distance_miles': journey.total_distance_miles,
                'personal_progress_miles': journey.personal_progress_miles,
                'progress_percentage': round((journey.personal_progress_miles / journey.total_distance_miles) * 100, 2),
                'is_complete': journey.finished_at is not None
            }

        return jsonify({
            "username": current_user.username,
            "display_name": current_user.display_name or current_user.username,
            "total_steps_life": current_user.total_steps_life,
            "today_steps": today_steps,
            "streak": streak,
            "total_miles": round(current_user.total_steps_life / 2000, 2),
            "level": user_level.current_level,
            "current_exp": user_level.current_exp,
            "exp_to_next_level": user_level.exp_to_next_level(),
            "badges": badges,
            "current_journey": journey_info
        })
    except Exception as e:
        return jsonify({'message': 'Failed to get profile'}), 500


@app.route("/api/steps/sync", methods=["POST"])
@token_required
def sync_steps(current_user):
    try:
        data = request.json
        steps_count = data.get('steps_count', 0)
        mode = data.get('mode', 'add')  # 'add' or 'set'
        
        if not isinstance(steps_count, int) or steps_count < 0:
            return jsonify({'message': 'Invalid steps_count'}), 400

        today = date.today()
        user_level = UserLevel.query.filter_by(user_id=current_user.id).first()
        if not user_level:
            user_level = UserLevel(user_id=current_user.id)
            db.session.add(user_level)

        existing_log = StepLog.query.filter_by(
            user_id=current_user.id,
            date=today
        ).first()

        if mode == 'add':
            # Add steps to existing count
            if existing_log:
                steps_difference = steps_count
                existing_log.steps_count += steps_count
                existing_log.distance_miles = existing_log.steps_count / 2000
                existing_log.timestamp = datetime.utcnow()
            else:
                steps_difference = steps_count
                new_log = StepLog(
                    user_id=current_user.id,
                    steps_count=steps_count,
                    date=today,
                    source=data.get('source', 'manual')
                )
                db.session.add(new_log)
        else:
            # Set total steps for the day (original behavior)
            if existing_log:
                steps_difference = steps_count - existing_log.steps_count
                existing_log.steps_count = steps_count
                existing_log.distance_miles = steps_count / 2000
                existing_log.timestamp = datetime.utcnow()
            else:
                steps_difference = steps_count
                new_log = StepLog(
                    user_id=current_user.id,
                    steps_count=steps_count,
                    date=today,
                    source=data.get('source', 'healthkit')
                )
                db.session.add(new_log)

        level_ups = 0
        if steps_difference > 0:
            current_user.total_steps_life += steps_difference
            exp_gained = steps_difference // 100
            level_ups = user_level.add_exp(exp_gained)

            if current_user.current_journey_id:
                personal_journey = current_user.current_journey
                if personal_journey and personal_journey.is_active:
                    distance_miles = steps_difference / 2000
                    personal_journey.personal_progress_miles += distance_miles

                    if (personal_journey.personal_progress_miles >= personal_journey.total_distance_miles and not personal_journey.finished_at):
                        personal_journey.finished_at = datetime.utcnow()
                        personal_journey.is_active = False
                        current_user.current_journey_id = None
                        completion_exp = 500
                        level_ups += user_level.add_exp(completion_exp)
        current_user.last_active = datetime.utcnow()
        db.session.commit()

        # Get the final step count for today
        final_log = StepLog.query.filter_by(
            user_id=current_user.id,
            date=today
        ).first()
        
        current_steps_today = final_log.steps_count if final_log else 0

        response_data = {
            'message': 'Steps synced successfully',
            'steps_added': steps_difference,
            'total_steps_today': current_steps_today,
            'total_steps_life': current_user.total_steps_life,
            'level': user_level.current_level,
            'current_exp': user_level.current_exp,
            'exp_to_next_level': user_level.exp_to_next_level(),
            'level_ups': level_ups
        }
        if current_user.current_journey_id:
            journey = current_user.current_journey
            response_data['journey_progress'] = {
                'journey_name': f'{journey.start_city} to {journey.end_city}',
                'progress_miles': round(journey.personal_progress_miles, 2),
                'total_miles': journey.total_distance_miles,
                'progress_percentage': round((journey.personal_progress_miles / journey.total_distance_miles) * 100, 2),
                'miles_added': round(steps_difference/2000, 2),
                'is_completed': journey.finished_at is not None
            }
            if journey.finished_at and journey.finished_at > (datetime.utcnow() - timedelta(minutes=1)):
                response_data['completion_message'] = f'Congratulations! You completed your journey from {journey.start_city} to {journey.end_city}!'
        return jsonify(response_data)
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': 'Failed to sync steps'}), 500

@app.route('/api/steps/history', methods=['GET'])
@token_required
def get_step_history(current_user):
    try:
        days = request.args.get('days', 30, type=int)
        days = min(days, 365)
        step_logs = StepLog.query.filter_by(user_id=current_user.id).order_by(StepLog.date.desc()).limit(days).all()
        return jsonify({
            'step_history': [log.to_dict() for log in step_logs],
            'total_days': len(step_logs)
        })
    except Exception as e:
        return jsonify({'message': 'Failed to get step history'}), 500

@app.route('/api/user/weekly-steps', methods=['GET'])
@token_required
def get_weekly_steps(current_user):
    try:
        # Get the last 7 days including today
        today = date.today()
        start_date = today - timedelta(days=6)
        
        # Get step logs for the past 7 days
        step_logs = StepLog.query.filter(
            StepLog.user_id == current_user.id,
            StepLog.date >= start_date,
            StepLog.date <= today
        ).order_by(StepLog.date.asc()).all()
        
        # Create a dictionary for quick lookup
        step_dict = {log.date: log.steps_count for log in step_logs}
        
        # Create the weekly data with all 7 days (fill missing days with 0)
        weekly_data = []
        for i in range(7):
            current_date = start_date + timedelta(days=i)
            weekly_data.append({
                'date': current_date.isoformat(),
                'steps': step_dict.get(current_date, 0)
            })
        
        return jsonify(weekly_data)
    except Exception as e:
        print(f"Error fetching weekly steps: {e}")
        return jsonify({'message': 'Failed to get weekly steps'}), 500

@app.route('/api/user/level', methods=['GET'])
@token_required
def get_user_level(current_user):
    try:
        # Simple level calculation: level = total_steps // 10000 + 1
        level = max(1, current_user.total_steps_life // 10000 + 1)
        experience = current_user.total_steps_life % 10000
        experience_to_next = 10000 - experience
        
        return jsonify({
            'level': level,
            'experience': experience,
            'experience_to_next': experience_to_next,
            'total_experience': current_user.total_steps_life
        })
    except Exception as e:
        print(f"Error fetching user level: {e}")
        return jsonify({'message': 'Failed to get user level'}), 500

@app.route("/api/journeys", methods=["GET"])
def journeys():
    try:
        journey_templates = Journey.query.filter_by(is_template=True, is_active=True).all()
        return jsonify({'journeys': [j.to_dict() for j in journey_templates]})
    except Exception as e:
        return jsonify({'message': 'Failed to get journeys'}), 500


@app.route('/api/journeys/<int:template_id>/start', methods=['POST'])
@token_required
def start_journey(current_user, template_id):
    try:
        template = Journey.query.filter_by(id=template_id, is_template=True).first()
        if not template:
            return jsonify({'message': 'Journey template not found'}), 404
        if current_user.current_journey_id:
            return jsonify({'message': 'Please complete current journey first'}), 400

        personal_journey = Journey(
            user_id=current_user.id,
            template_id=template_id,
            start_city=template.start_city,
            end_city=template.end_city,
            description=template.description,
            total_distance_miles=template.total_distance_miles,
            difficulty=template.difficulty,
            personal_progress_miles=0.0,
            is_template=False
        )
        db.session.add(personal_journey)
        db.session.flush()

        current_user.current_journey_id = personal_journey.id
        db.session.commit()
        return jsonify({
            'message': f'Started journey: {template.start_city} to {template.end_city}',
            'journey': personal_journey.to_dict()
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': 'Failed to start journey'}), 500

@app.route('/api/journeys/end', methods=['POST'])
@token_required
def end_journey(current_user):
    try:
        if not current_user.current_journey_id:
            return jsonify({'message': 'Not currently on a journey'}), 400
        current_user.current_journey_id = None
        current_user.updated_at = datetime.utcnow()
        db.session.commit()
        return jsonify({'message': 'Successfully ended journey'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': 'Failed to end journey'}), 500

@app.route("/api/leaderboard", methods=["GET"])
@token_required
def leaderboard(current_user):
    try:
        timeframe = request.args.get('timeframe', 'all')
        limit = min(request.args.get('limit', 10, type=int), 50)
        friends_only = request.args.get('friends_only', 'false').lower() == 'true'
        
        # Get friend user IDs if friends_only is requested
        friend_user_ids = set()
        if friends_only:
            friendships = db.session.query(Friendship).filter(
                db.or_(
                    db.and_(Friendship.sender_id == current_user.id, Friendship.status == 'accepted'),
                    db.and_(Friendship.receiver_id == current_user.id, Friendship.status == 'accepted')
                )
            ).all()
            
            for friendship in friendships:
                friend_id = friendship.receiver_id if friendship.sender_id == current_user.id else friendship.sender_id
                friend_user_ids.add(friend_id)
            
            # Always include current user in friends leaderboard
            friend_user_ids.add(current_user.id)
        
        if timeframe == 'day':
            today = date.today()
            step_logs_query = db.session.query(
                StepLog.user_id,
                db.func.sum(StepLog.steps_count).label('total_steps')
            ).filter(StepLog.date == today)
            
            if friends_only and friend_user_ids:
                step_logs_query = step_logs_query.filter(StepLog.user_id.in_(friend_user_ids))
            
            step_logs = step_logs_query.group_by(StepLog.user_id).all()
            
        elif timeframe == 'week':
            week_ago = date.today() - timedelta(days=7)
            step_logs_query = db.session.query(
                StepLog.user_id,
                db.func.sum(StepLog.steps_count).label('total_steps')
            ).filter(StepLog.date >= week_ago)
            
            if friends_only and friend_user_ids:
                step_logs_query = step_logs_query.filter(StepLog.user_id.in_(friend_user_ids))
                
            step_logs = step_logs_query.group_by(StepLog.user_id).all()
            
        elif timeframe == 'month':
            current_month = date.today().replace(day=1)
            step_logs_query = db.session.query(
                StepLog.user_id,
                db.func.sum(StepLog.steps_count).label('total_steps')
            ).filter(StepLog.date >= current_month)
            
            if friends_only and friend_user_ids:
                step_logs_query = step_logs_query.filter(StepLog.user_id.in_(friend_user_ids))
                
            step_logs = step_logs_query.group_by(StepLog.user_id).all()
        else:
            # All time leaderboard
            if friends_only and friend_user_ids:
                users = User.query.filter(
                    User.total_steps_life > 0,
                    User.id.in_(friend_user_ids)
                ).all()
            else:
                users = User.query.filter(User.total_steps_life > 0).all()
            step_logs = [(user.id, user.total_steps_life) for user in users]

        leaderboard_data = []
        for user_id, total_steps in step_logs:
            user = User.query.get(user_id)
            if user and total_steps > 0:
                user_level = UserLevel.query.filter_by(user_id=user.id).first()
                
                # Check if this user is the current user or a friend
                is_current_user = user.id == current_user.id
                is_friend = user.id in friend_user_ids if friends_only else False
                
                leaderboard_data.append({
                    'rank': 0,
                    'user_id': user.id,
                    'username': user.username,
                    'display_name': user.display_name or user.username,
                    'avatar_url': user.avatar_url,
                    'steps': total_steps,
                    'miles': round(total_steps/2000, 2),
                    'level': user_level.current_level if user_level else 1,
                    'is_current_user': is_current_user,
                    'is_friend': is_friend
                })

        leaderboard_data.sort(key=lambda x: x['steps'], reverse=True)
        for i, entry in enumerate(leaderboard_data[:limit]):
            entry['rank'] = i + 1

        return jsonify({
            'timeframe': timeframe,
            'friends_only': friends_only,
            'total_entries': len(leaderboard_data),
            'leaderboard': leaderboard_data[:limit]
        })
    except Exception as e:
        return jsonify({'message': 'Failed to get leaderboard', 'error': str(e)}), 500

@app.route('/api/bosses', methods=['GET'])
@token_required
def get_bosses(current_user):
    try:
        journey_id = current_user.current_journey_id
        bosses = BossManager.get_available_bosses(
            user_id=current_user.id,
            journey_id=journey_id
        )
        return jsonify({
            'bosses': [boss.to_dict() for boss in bosses]
        }), 200

    except Exception as e:
        return jsonify({'error': 'Failed to get bosses'}), 500

@app.route('/api/bosses/<int:boss_id>/attack', methods=['POST'])
@token_required
def attack_boss(current_user, boss_id):
    try:
        data = request.get_json()
        if not data or 'steps_to_use' not in data:
            return jsonify({'error': 'steps_to_use required'}), 400
        steps_to_use = data['steps_to_use']
        if not isinstance(steps_to_use, int) or steps_to_use <= 0:
            return jsonify({'error': 'steps_to_use must be a postive integer'}), 400

        today = date.today()
        today_log = StepLog.query.filter_by(user_id=current_user.id, date=today).first()
        available_steps = today_log.steps_count if today_log else 0

        if steps_to_use > available_steps:
            return jsonify({
                'error': 'Insufficient steps',
                'available_steps': available_steps,
                'requested_steps': steps_to_use
            }), 400

        result = BossManager.attack_boss(current_user, boss_id, steps_to_use)

        # Subtract the steps used from today's step count
        if 'error' not in result:
            # Refresh the step log to avoid any stale data issues
            db.session.refresh(today_log)
            today_log.steps_count -= steps_to_use
            if today_log.steps_count < 0:
                today_log.steps_count = 0
            db.session.commit()
            print(f"DEBUG: Subtracted {steps_to_use} steps from user {current_user.id}. New count: {today_log.steps_count}")

        if 'error' in result:
            return jsonify(result), 400
        return jsonify(result), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to attack boss'}), 500

# Friendship endpoints
@app.route('/api/friends', methods=['GET'])
@token_required
def get_friends(current_user):
    """Get user's friends and friend requests"""
    try:
        # Get accepted friendships
        friends_query = db.session.query(Friendship).filter(
            db.or_(
                db.and_(Friendship.sender_id == current_user.id, Friendship.status == 'accepted'),
                db.and_(Friendship.receiver_id == current_user.id, Friendship.status == 'accepted')
            )
        )
        
        friends = []
        for friendship in friends_query:
            friend_user = friendship.receiver if friendship.sender_id == current_user.id else friendship.sender
            friends.append({
                'id': friend_user.id,
                'username': friend_user.username,
                'display_name': friend_user.display_name or friend_user.username,
                'avatar_url': friend_user.avatar_url,
                'total_steps': friend_user.total_steps_life,
                'last_active': friend_user.last_active.isoformat() if friend_user.last_active else None,
                'friendship_date': friendship.accepted_at.isoformat() if friendship.accepted_at else None
            })
        
        # Get pending requests received
        pending_requests = db.session.query(Friendship).filter(
            Friendship.receiver_id == current_user.id,
            Friendship.status == 'pending'
        )
        
        requests = []
        for request in pending_requests:
            requests.append({
                'id': request.id,
                'sender': {
                    'id': request.sender.id,
                    'username': request.sender.username,
                    'display_name': request.sender.display_name or request.sender.username,
                    'avatar_url': request.sender.avatar_url,
                    'total_steps': request.sender.total_steps_life
                },
                'sent_at': request.sent_at.isoformat()
            })
        
        return jsonify({
            'friends': friends,
            'friend_requests': requests
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/friends/send-request', methods=['POST'])
@token_required
def send_friend_request(current_user):
    """Send a friend request"""
    try:
        data = request.get_json()
        username = data.get('username')
        
        if not username:
            return jsonify({'error': 'Username is required'}), 400
        
        # Find target user
        target_user = User.query.filter_by(username=username).first()
        if not target_user:
            return jsonify({'error': 'User not found'}), 404
        
        if target_user.id == current_user.id:
            return jsonify({'error': 'Cannot send friend request to yourself'}), 400
        
        # Check if friendship already exists
        existing = Friendship.query.filter(
            db.or_(
                db.and_(Friendship.sender_id == current_user.id, Friendship.receiver_id == target_user.id),
                db.and_(Friendship.sender_id == target_user.id, Friendship.receiver_id == current_user.id)
            )
        ).first()
        
        if existing:
            if existing.status == 'accepted':
                return jsonify({'error': 'Already friends'}), 400
            else:
                return jsonify({'error': 'Friend request already sent'}), 400
        
        # Create new friendship request
        friendship = Friendship(
            sender_id=current_user.id,
            receiver_id=target_user.id,
            status='pending'
        )
        db.session.add(friendship)
        db.session.commit()
        
        return jsonify({'message': f'Friend request sent to {username}'}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/friends/respond', methods=['POST'])
@token_required
def respond_to_friend_request(current_user):
    """Accept or decline a friend request"""
    try:
        data = request.get_json()
        request_id = data.get('request_id')
        action = data.get('action')  # 'accept' or 'decline'
        
        if not request_id or action not in ['accept', 'decline']:
            return jsonify({'error': 'Invalid request'}), 400
        
        friendship = Friendship.query.filter_by(
            id=request_id,
            receiver_id=current_user.id,
            status='pending'
        ).first()
        
        if not friendship:
            return jsonify({'error': 'Friend request not found'}), 404
        
        if action == 'accept':
            friendship.status = 'accepted'
            friendship.accepted_at = datetime.utcnow()
            db.session.commit()
            return jsonify({'message': 'Friend request accepted'}), 200
        else:
            db.session.delete(friendship)
            db.session.commit()
            return jsonify({'message': 'Friend request declined'}), 200
            
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/friends/remove', methods=['DELETE'])
@token_required
def remove_friend(current_user):
    """Remove a friend"""
    try:
        data = request.get_json()
        friend_user_id = data.get('user_id')
        
        if not friend_user_id:
            return jsonify({'error': 'User ID is required'}), 400
        
        friendship = Friendship.query.filter(
            db.or_(
                db.and_(Friendship.sender_id == current_user.id, Friendship.receiver_id == friend_user_id),
                db.and_(Friendship.sender_id == friend_user_id, Friendship.receiver_id == current_user.id)
            ),
            Friendship.status == 'accepted'
        ).first()
        
        if not friendship:
            return jsonify({'error': 'Friendship not found'}), 404
        
        db.session.delete(friendship)
        db.session.commit()
        
        return jsonify({'message': 'Friend removed'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/users/search', methods=['GET'])
@token_required
def search_users(current_user):
    """Search for users by username"""
    try:
        query = request.args.get('q', '').strip()
        if len(query) < 2:
            return jsonify({'users': []}), 200
        
        users = User.query.filter(
            User.username.ilike(f'%{query}%'),
            User.id != current_user.id
        ).limit(20).all()
        
        results = []
        for user in users:
            # Check friendship status
            friendship = Friendship.query.filter(
                db.or_(
                    db.and_(Friendship.sender_id == current_user.id, Friendship.receiver_id == user.id),
                    db.and_(Friendship.sender_id == user.id, Friendship.receiver_id == current_user.id)
                )
            ).first()
            
            friendship_status = 'none'
            if friendship:
                if friendship.status == 'accepted':
                    friendship_status = 'friends'
                elif friendship.sender_id == current_user.id:
                    friendship_status = 'request_sent'
                else:
                    friendship_status = 'request_received'
            
            results.append({
                'id': user.id,
                'username': user.username,
                'display_name': user.display_name or user.username,
                'avatar_url': user.avatar_url,
                'total_steps': user.total_steps_life,
                'friendship_status': friendship_status
            })
        
        return jsonify({'users': results})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/')
def home():
    return jsonify({
        'api': 'StepUp Backend',
        'version': '1.0',
        'status': 'running',
        'endpoints': {
            'auth': ['/api/register', '/api/login'],
            'user': ['/api/user/profile'],
            'steps': ['/api/steps/sync', '/api/steps/history'],
            'journeys': ['/api/journeys', '/api/journeys/<id>/join', '/api/journeys/leave'],
            'leaderboard': ['/api/leaderboard'],
            'bosses': ['/api/bosses', '/api/bosses/<id>/attack'],
            'friends': ['/api/friends', '/api/friends/send-request', '/api/friends/respond', '/api/friends/remove'],
            'users': ['/api/users/search']
        }
    })

def init_db():
    """Initialize database and create journey templates"""
    with app.app_context():
        db.create_all()
        if Journey.query.filter_by(is_template=True).count() == 0:
            print('Creating journey templates...')
            for journey_data in PRESET_JOURNEYS:
                template = Journey(
                    is_template=True,
                    user_id=None,
                    **journey_data
                )
                db.session.add(template)
            db.session.commit()
            print(f'Created {len(PRESET_JOURNEYS)} journey templates')

if __name__ == "__main__":
    init_db()
    app.run(host='0.0.0.0', port=5001, debug=True)