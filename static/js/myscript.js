document.addEventListener('DOMContentLoaded',function(){
	// Set starting value of username to 0

	var username = localStorage.getItem('username');
	var chanlName = localStorage.getItem('latestActiveChannel');
	let comp=0;
	while (!localStorage.getItem('username') || username =='null' || comp >= 3){
		let usr = prompt('Please enter a display name:');
		if(usr.trim() != '' && usr.trim() != 'null' && usr.trim() != null){
			username = usr.trim();
			localStorage.setItem('username', username);
			window.location.replace('/'+username);
		}
		comp++;
		if (comp >= 3){
			alert('An error prevents you from accessing our application. Check your username and try again !');
			comp=0;
		}
	}
	
	if(document.location.pathname.length <=3 && username != 'null')
		window.location.replace('/'+username);
	/*else if(document.location.pathname !='' && document.location.pathname != '/'+username.trim()){
		localStorage.setItem('username', prompt('Please enter a valid display name (you may have to verify):'));
		window.location.replace('/'+username);
	}*/
	
	function add_msg(msg){
		//if(msg.dest == chanlName){
			let msg_win = document.querySelector('#msgContent');
			let msg_span= document.createElement("span");
			let clr= document.createElement("div");
			clr.setAttribute('class','clearfix');
			msg_span.setAttribute('class','msg-to');
			msg_win.appendChild(msg_span);
			msg_win.appendChild(clr);
			if(msg.sender == username){
				msg_span.setAttribute('class','msg-from pull-right');
			}
			else{
				msg_span.setAttribute('class','msg-to');
			}
			if (msg.sender == username)
				msg_span.innerHTML ='<strong>Me:</strong> '+ msg.msg+'<br><small>'+msg.date+'</small>';
			else
				msg_span.innerHTML ='<a href="?chat='+msg.sender+'" class="user-from" title="Send private message.">'+msg.sender+'</a>: '+ msg.msg+'<br><small>'+msg.date+'</small>';
		//	}
	}

	function loadData(chan=chanlName){
		// Initialize new request
		const request = new XMLHttpRequest();
		request.open('GET', '/get_messages/data.json?'+'username='+username+'&channel='+chan);

		// Callback function for when request completes
		request.onload = () => {
			// Extract JSON data from request
			const data = JSON.parse(request.responseText);

			// Update the result div
			if (data.success) {
				//clear messages first
				document.querySelector('#msgContent').innerHTML='';
				const messages = data.messages;
				messages.forEach(function(msg,index){
				if( msg.dest == chan ){
					add_msg(msg);
					}
				});
			}
			else {
				document.querySelector('#msgContent').innerHTML = 'There was an error.';
			}
		}
		
		// Add data to send with request
		const data = new FormData();
		//data.append('username',username);
		// Send request
		request.send(data);
		//return false;
	}
	loadData(chanlName);

	function loadPrivData(chan=chanlName){
		// Initialize new request
		const request = new XMLHttpRequest();
		request.open('GET', '/get_messages/data.json?'+'username='+username);

		// Callback function for when request completes
		request.onload = () => {
			// Extract JSON data from request
			const data = JSON.parse(request.responseText);

			// Update the result div
			if (data.success) {
				//clear messages first
				document.querySelector('#msgContent').innerHTML='';
				const messages = data.messages;
				messages.forEach(function(msg,index){
				if( (msg.dest == username && msg.sender == chan)  || (msg.sender == username && msg.dest == chan)){
					add_msg(msg);
					}
				});
			}
			else {
				document.querySelector('#msgContent').innerHTML = 'There was an error.';
			}
		}
		
		// Add data to send with request
		const data = new FormData();
		//data.append('username',username);
		// Send request
		request.send(data);
		//return false;
	}
	loadPrivData(chanlName);

	// Load current value of  username on chatbox title
	var chbTitle = document.querySelector('#chbTitle');
	chbTitle.innerHTML += ' - '+username;		
	
	// Function selecting the active channel
	function selectChannel(lnk){
		document.querySelectorAll('.list-group-item').forEach(a => {
			a.setAttribute("class","list-group-item list-group-item-action pt-1 pb-1");
			});
		lnk.setAttribute("class","list-group-item list-group-item-action pt-1 pb-1 active");
		// Reset badge if any
		lnk.innerHTML = lnk.dataset.name;
		chanlName = lnk.dataset.name;
		localStorage.setItem('latestActiveChannel', chanlName);
		if(lnk.dataset.type == 'channel')
			loadData(chanlName);
		else
			loadPrivData(chanlName);
	}
	document.querySelectorAll('.list-group-item').forEach(a => {
		a.onclick = () => {
			selectChannel(a);
		};
	});
	function logout(){
		localStorage.removeItem('username');
		window.location.reload();
		}

	document.querySelector('#logout').onclick= function(a){
		logout();
		}
	// Getting channel list from server
	$('#joinChanModal').on('show.bs.modal', function (event) {
		const request = new XMLHttpRequest();
		request.open('GET', '/get_channels/data.json?'+'username='+username);

		// Callback function for when request completes
		request.onload = () => {
			// Extract JSON data from request
			const data = JSON.parse(request.responseText);

			// Update the result div
			if (data.success) {
				//clear messages first
				document.querySelector('#channelList').innerHTML='';
				const channels = data['chatrooms'];
				let ch_item = document.createElement('option');
				ch_item.setAttribute('value','');
				ch_item.innerHTML='Select channel';
				document.querySelector('#channelList').append(ch_item);
				
				channels.forEach(function(channel,index){
					let ch_item = document.createElement('option');
					ch_item.setAttribute('value',channel);
					ch_item.innerHTML=channel;
					document.querySelector('#channelList').append(ch_item);
				});
			}
			else {
				alert('There was an error retriving channels list.');
			}
		}
		// Send request
		request.send();
	});
		
	// Selecting latest active channel on load
	document.querySelectorAll('.list-group-item').forEach(a => {
		if(a.dataset.name == localStorage.getItem('latestActiveChannel')){
			a.setAttribute("class","list-group-item list-group-item-action pt-1 pb-1 active");
			selectChannel(a);
		}
	});

	// Connect to websocket
	var socket = io.connect(location.protocol + '//' + document.domain + ':' + location.port);

	// When connected, configure buttons
	socket.on('connect', () => {
		// Tell the server to broadcast my status
		socket.emit('user connected', {'username': username});
		// submit new message event
		document.querySelector('#send').onclick= function(){
			const new_msg = document.querySelector('#message').value;
			if(new_msg.trim()!='' && chanlName!=''){
				socket.emit('new message', {'message': new_msg,'sender':username,'dest':chanlName});
				document.querySelector('#message').value=''; 
			}    
		}
		// submit new channel event
		document.querySelector('#createChanBtn').onclick= function(){
			const new_channel = document.querySelector('#fchname').value;
			socket.emit('create channel', {'channelName': new_channel,'username':username});
			document.querySelector('#message').value='';
		}
		// submit join channel event
		document.querySelector('#joinChanBtn').onclick= function(){
			const chosen_channel = document.querySelector('#channelList').value;
			if(chosen_channel !='')
				socket.emit('join channel', {'channelName': chosen_channel,'username':username});
			$('#joinChanModal').modal('toggle');
			document.querySelector('#channelList').value='';
		}
	});
	
	// handling enter key on text box
	var textbox = document.querySelector('#message');
	textbox.addEventListener("keypress", function(event){
		if (event.keyCode === 13){
			event.preventDefault();
			document.querySelector('#send').click();
			}
		});
	// When a new message is announced, add to the list
	socket.on('messages update', data => {
		const newMSG= data['messages'][data['messages'].length-1];
		if( (newMSG.dest == username && newMSG.sender == chanlName)  || (newMSG.sender == username && newMSG.dest == chanlName) || newMSG.dest == chanlName )
			add_msg(newMSG);
		// Showing badge for new message
		if(newMSG.dest == username){ //Private message
			let badge = document.createElement('span');
			badge.setAttribute('class','badge badge-primary pull-right');
			badge.innerHTML='new';
			document.querySelector('#'+newMSG.sender).appendChild(badge);
		}
		else if(document.querySelector('#'+newMSG.dest) && newMSG.sender != username){ // Chat room message
			let badge = document.createElement('span');
			badge.setAttribute('class','badge badge-primary pull-right');
			badge.innerHTML='new';
			document.querySelector('#'+newMSG.dest).appendChild(badge);
		}
	});

	// update channels list function
	function update_channels(data){
		let ch_win = document.querySelector('#channelPanel');
		let ch = document.createElement("a");
		ch.setAttribute('class','list-group-item list-group-item-action pt-1 pb-1');
		ch.setAttribute('href','javascript:void(0);');
		ch.setAttribute('id',data['mychannels'][data['mychannels'].length-1]);
		ch.setAttribute('data-name',data['mychannels'][data['mychannels'].length-1]);
		ch.setAttribute('data-type','channel');
		ch.innerHTML = data['mychannels'][data['mychannels'].length-1];
		ch_win.appendChild(ch);
		document.querySelectorAll('.list-group-item').forEach(a => {
			a.onclick = () => {
				selectChannel(a);
			};
		});
	}
	// When a new channel is announced, add to the unordered list
	socket.on('channels update', data => {
		if(data.username == username){
			// call update channel function
			update_channels(data);
			$('#createChanModal').modal('hide');
			document.querySelector('#fchname').value='';
		}
	});

	// When a new user is connected
	socket.on('user online', data => {
		console.log('user connected: '+data.username);
		if (data.username != username){
			update_channels(data);
		}
	});

	// Show alert message on error
	socket.on('error', data => {
		if(data.username == username){
			alert(data['error']);
		}
	});

});
