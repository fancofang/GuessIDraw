from main import create_app
from main.extensions import socketio

app =create_app()

if __name__ == "__main__":
    socketio.run(app)
