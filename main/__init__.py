import os
import click
from flask import Flask
from main.extensions import db, socketio, login_manager, csrf, moment, redis, migrate
from main.configs import config
from main.blueprints.index import index_bp
from main.blueprints.chat import chat_bp
from main.blueprints.auth import auth_bp
from main.models import User, Message, Room, Word

def create_app(config_name=None):
    if config_name is None:
        config_name = os.getenv('FLASK_CONFIG', 'development')

    app = Flask('main')
    app.config.from_object(config[config_name])
    register_shell_context(app)
    register_extensions(app)
    register_blueprints(app)
    register_commands(app)
    import main.blueprints.socket

    return app

def register_extensions(app):
    db.init_app(app)
    migrate.init_app(app,db)
    socketio.init_app(app, async_mode="eventlet")
    login_manager.init_app(app)
    csrf.init_app(app)
    moment.init_app(app)
    redis.init_app(app, decode_responses=True)


def register_blueprints(app):
    app.register_blueprint(index_bp)
    app.register_blueprint(chat_bp)
    app.register_blueprint(auth_bp)


def register_shell_context(app):
    @app.shell_context_processor
    def make_shell_context():
        return dict(db=db, User=User, Message=Message, Room=Room, Word=Word)

def register_commands(app):
    @app.cli.command()
    @click.option('--drop', is_flag=True, help='Create after drop.')
    def initdb(drop):
        """Initialize the database."""
        if drop:
            click.confirm('This operation will delete the database, do you want to continue?', abort=True)
            db.drop_all()
            click.echo('Drop tables.')
        db.create_all()
        click.echo('Initialized database.')

    @app.cli.command()
    @click.option('--message', default=300, help='Quantity of messages, default is 300.')
    def forge(message):
        """Generate fake data."""
        import random, json
        from sqlalchemy.exc import IntegrityError

        from faker import Faker

        fake = Faker(locale='en_GB')

        click.echo('Initializing the database...')
        db.drop_all()
        db.create_all()

        click.echo('Forging the data...')
        admin = User(nickname='Fanco', email='test1@example.com')
        admin.set_password('123456')
        db.session.add(admin)
        db.session.commit()
        
        click.echo('Generating users...')
        for i in range(30):
            user = User(
                nickname=fake.name(),
                email=fake.email())
            db.session.add(user)
        db.session.commit()

        click.echo('Generating rooms...')
        for i in range(7):
            leader = User.query.get(random.randint(1, User.query.count()))
            room = Room(
                name=fake.word(),
                leader=leader.nickname
            )
            room.users.append(leader)
            print(room.name, room.leader)
            users_list = [User.query.get(random.randint(1, User.query.count())) for i in range(1,random.randrange(4,6))]
            for user in users_list:
                room.users.append(user)
            print("room:",room, ";members:",room.users)
            db.session.add(room)
        db.session.commit()

        # click.echo('Generating users...')
        # for i in range(30):
        #     user = User(
        #         nickname=fake.name(),
        #         email=fake.email(),
        #         room=Room.query.get(random.randint(1, Room.query.count())),
        #                 )
        #     db.session.add(user)
        #     try:
        #         db.session.commit()
        #     except IntegrityError:
        #         db.session.rollback()

        click.echo('Generating messages...')
        for i in range(message):
            set_room = Room.query.get(random.randint(1, Room.query.count()))
            set_user = random.choice(set_room.users)
            message = Message(
                user=set_user,
                body=fake.sentence(),
                timestamp=fake.date_time_between('-30d', '-2d'),
                room=set_room
            )
            db.session.add(message)

        db.session.commit()

        click.echo('Generating words...')
        file = os.path.join(os.path.split(os.path.dirname(__file__))[0], 'topic.json')
        with open(file, 'r') as f:
            questions = json.load(f)
        print(questions)
        print(type(questions))
        for category in questions:
            for word in questions[category]:
                new_instance = Word(name=word, category=category)
                db.session.add(new_instance)
                print(word)
        try:
            db.session.commit()

        except IntegrityError:
            db.session.rollback()

        click.echo('Done.')
        
        
    @app.cli.command()
    def initquestion():
        """Initialize the database of word."""
        import json
        file = os.path.join(os.path.split(os.path.dirname(__file__))[0], 'topic.json')
        with open(file, 'r') as f:
            questions = json.load(f)
        print(questions)
        print(type(questions))
        for category in questions:
            for word in questions[category]:
                new_instance = Word(name=word, category=category)
                db.session.add(new_instance)
                print(word)
        db.session.commit()
        
        
        