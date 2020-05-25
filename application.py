import os

from flask import Flask, render_template
from flask_socketio import SocketIO, emit

app = Flask(__name__)
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY")
socketio = SocketIO(app)


@app.route("/")
def index():
	data={"page_title":"Home page"}
	return render_template("index.html",data=data)

@app.route("/subscribe")
def subscribe():
	data={"page_title":"Home page"}
	return render_template("layout.html",data=data)

@app.route("/login")
def login():
	data={"page_title":"Home page"}
	return render_template("layout.html",data=data)

@app.route("/logout")
def logout():
	data={"page_title":"Home page"}
	return render_template("layout.html",data=data)
