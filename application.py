import os

from flask import Flask, render_template, jsonify, request
from flask_socketio import SocketIO, emit
import datetime

app = Flask(__name__)
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY")
socketio = SocketIO(app)

usernames=[]
chatrooms=['general']
channels={}
messages=[]

chatrooms.append('channel 1')
chatrooms.append('channel 2')
messages.append({"msg":"Salut Madley","date":"2020/05/25 18:30","sender":"yelemama","dest":"general"})
messages.append({"msg":"Comment vas-tu ?","date":"2020/05/25 18:35","sender":"yelemama","dest":"general"})
messages.append({"msg":"Bonjour my friend, suis la et toi ?","date":"2020/05/25 18:45","sender":"madleysk","dest":"general"})


@app.route("/")
@app.route("/<string:username>")
def index(username=None):
	data={"page_title":"Home page"}
	data['chatrooms']=chatrooms.sort()
	data['messages']=messages
	try:
		mychannels=channels[username]
	except KeyError:
		mychannels = channels[username]= ['general']
	mychannels.sort()
	data['mychannels']=mychannels
	if username != None and username not in usernames:
		usernames.append(username)
	data['username']= username
	return render_template("index.html",data=data)


@app.route("/get_channels/data.json")
def get_channels():
	data={"page_title":"Channel list"}
	return jsonify({"success":True, "chatrooms":chatrooms})


@app.route("/get_messages/data.json")
def get_messages():
	data={"page_title":"Home page"}
	username = request.args.get('username')
	return jsonify({"success":True,"messages":messages})

@app.route("/create_channel", methods=['POST'])
def create_channel():
	data={"page_title":"Create channel"}
	chname = request.form.get('chname')
	print('valeur champs',chname)
	if chname.lower() not in chatrooms:
		chatrooms.append(chname.lower()) 
	else:
		return jsonify({"success":False,"message":"Chnnel name already exists."})
	return jsonify({"success":True,"chatroom":chname})

@socketio.on("new message")
def message(data):
	timestamp=datetime.datetime.strftime(datetime.datetime.now(),'%Y/%m/%d %H:%M')
	messages.append({"msg":data["message"],"date":timestamp,"sender":data['sender'],"dest":data['dest']})
	emit("messages update", {"username":data['sender'],"messages":messages}, broadcast=True)

@socketio.on("create channel")
def on_create_channel(data):
	if data['channelName'].lower() not in chatrooms:
		chatrooms.append(data['channelName'].lower())
		channels[data['username']].append(data['channelName'].lower())
		emit("channels update", {"username":data['username'],"mychannels":channels[data['username']]}, broadcast=True)
	else:
		emit("error", {"username":data['username'],"error":'Chatroom already exist.'}, broadcast=True)

@socketio.on("join channel")
def on_join_channel(data):
	if data['username'] in usernames:
		if data['channelName'] not in channels[data['username']]:
			channels[data['username']].append(data['channelName'])
			emit("channels update", {"username":data['username'],"mychannels":channels[data['username']]}, broadcast=True)
		else:
			emit("error", {"error":'You are already registered to this chatroom.'}, broadcast=True)
	else:
		emit("error", {"username":data['username'],"error":'Username not recognized.'}, broadcast=True)
