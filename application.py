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
chmsg={chatrooms[0]:[]}
privateMSG=[]

#chmsg['general'].append({"msg":"Salut Madley","date":"2020/05/25 18:30","sender":"yelemama","dest":"general"})
#chmsg['general'].append({"msg":"Comment vas-tu ?","date":"2020/05/25 18:35","sender":"yelemama","dest":"general"})
#chmsg['general'].append({"msg":"Bonjour my friend, suis la et toi ?","date":"2020/05/25 18:45","sender":"madleysk","dest":"general"})
#usernames.append('madleysk')
#usernames.append('yelemama')
#usernames.append('skylee')

@app.route("/")
@app.route("/<string:username>")
def index(username=None):
	data={"page_title":"Home page"}
	data['chatrooms']=chatrooms.sort()
	mymessages=[]
	try:
		mychannels=channels[username]
	except KeyError:
		mychannels = channels[username]= ['general']
	mychannels.sort()
	# Searching messages of user's channels and push them to his messages list
	for ch in mychannels:
		if ch not in chmsg:
			chmsg[ch]=[]
		else:
			for msg in chmsg[ch]:
				mymessages.append(msg)
	# setting front user's variables
	data['mychannels']=mychannels
	data['messages']=mymessages
	if username != None and username not in usernames:
		if username != 'favicon.ico':
			"""Getting rid of the favicon.ico in users name list"""
			usernames.append(username)
	data['username']= username
	data['usernames']= usernames
	return render_template("index.html",data=data)


@app.route("/get_channels/data.json")
def get_channels():
	# data={"page_title":"Channel list"}
	not_mychannels = []
	username = request.args.get('username')
	if username and username is not None:
		for room in chatrooms:
			if room not in channels[username]:
				not_mychannels.append(room)
		return jsonify({"success":True, "chatrooms":not_mychannels})
	return jsonify({"success":True, "chatrooms":chatrooms})


@app.route("/get_messages/data.json")
def get_messages():
	# data={"page_title":"Home page"}
	# username = request.args.get('username')
	channel = request.args.get('channel')
	if channel and channel is not None:
		if channel in chmsg:
			return jsonify({"success":True,"messages":chmsg[channel]})
	else:
		return jsonify({"success":True,"messages":privateMSG})
			
	return jsonify({"success":True,"messages":[]})

@socketio.on("new message")
def message(data):
	timestamp=datetime.datetime.strftime(datetime.datetime.now(),'%Y/%m/%d %H:%M')
	if len(data['dest'])>=3 and data['dest'] is not None:
		if data['dest'] in usernames:
			privateMSG.append({"msg":data["message"],"date":timestamp,"sender":data['sender'],"dest":data['dest']})
			emit("messages update", {"username":data['sender'],"messages":privateMSG}, broadcast=True)
		else:
			# create the channel if not in user's list
			if data['dest'] not in chmsg:
				chmsg[data['dest']]=[]
			# Remove channels as there are more to add if channel's messages count is already 100
			if len(chmsg[data['dest']]) >=100:
				chmsg[data['dest']].pop(0)
			# Add message to the list then broadcast the new message to all users
			chmsg[data['dest']].append({"msg":data["message"],"date":timestamp,"sender":data['sender'],"dest":data['dest']})
			emit("messages update", {"username":data['sender'],"messages":chmsg[data['dest']]}, broadcast=True)

@socketio.on("create channel")
def on_create_channel(data):
	if len(data['channelName']) >= 3:
		if data['channelName'].lower() in usernames:
			emit("error", {"username":data['username'],"error":'Channel name not available.'}, broadcast=True)
		else:
			if data['channelName'].lower() not in chatrooms:
				print('socket create channel '+data['channelName'].lower())
				chatrooms.append(data['channelName'].lower())
				channels[data['username']].append(data['channelName'].lower())
				emit("channels update", {"username":data['username'],"mychannels":channels[data['username']]}, broadcast=True)
			else:
				emit("error", {"username":data['username'],"error":'Channel already exist.'}, broadcast=True)
	else:
		emit("error", {"username":data['username'],"error":'Channel name must be at least 3 characteres.'}, broadcast=True)

@socketio.on("join channel")
def on_join_channel(data):
	if data['username'] in usernames:
		if data['channelName'] not in channels[data['username']]:
			print('socket join channel '+data['channelName'].lower())
			channels[data['username']].append(data['channelName'])
			emit("channels update", {"username":data['username'],"mychannels":channels[data['username']]}, broadcast=True)
		else:
			emit("error", {"error":'You are already registered to this channel.'}, broadcast=True)
	else:
		emit("error", {"username":data['username'],"error":'Username not recognized.'}, broadcast=True)


@socketio.on("user connected")
def on_user_connected(data):
	# print('User '+data['username']+' connected')
	emit("user online",{"username":data['username']})
