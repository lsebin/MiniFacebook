const express = require('express');
const session = require('express-session');
const { createUser } = require('./models/database.js');

const app = express();
const PORT = 8080; // port
const http = require('http');
const server = http.createServer(app);
const {Server} = require("socket.io");

const routes = require('./routes/routes.js');
const newsroutes = require('./routes/newsroutes.js');

app.use(express.urlencoded()); // express will parse queries from the URL
app.use(express.static('static')); // express serves static resources from static folder
app.set('view engine', 'pug'); // set the rendering engine to pug
app.use(session({
  secret: 'nets2120projectgroup11',
  resave: false,
  saveUninitialized: true,
  cookie: {
    maxAge: 1000 * 60 * 60 * 12 // 12 hours
  }
}));

/**
 * route = URL that will redirect to other URLs
 * get = URL that will respond with a rendered page
 * post = URL that will post data to database
 * json = URL that will respond with JSON data
 */
app.get('/', routes.getSplash);
app.get('/signup', routes.getSignUp);
app.get('/login', routes.getLogin);
app.get('/wall', routes.getWall);
app.get('/searchuser', routes.getSearchUser);
// app.get('/profile', null);
app.get('/settings', routes.getSettings);
app.get('/friends', routes.getFriends);
app.get('/mywall/:username', routes.getMyWall);
app.get('/notifications', routes.getNotifications);

//kevin: visualizer routes call
app.get('/visualizer', routes.getVisualizer);

app.get('/sendvisualizeruser', routes.sendVisualizerUser);

app.get('/friendvisualization', routes.sendInitialVisualization); //postGetFriend?

app.get('/getFriends/:user', routes.sendFriends); //routes.postGetFriend?
// function(req, res) {
//   console.log(req.params.user);
//   var newFriends = {"id": "alice","name": "Alice","children": [{
//       "id": "james",
//           "name": "James",
//           "data": {},
//           "children": [{
//               "id": "arnold",
//               "name": "Arnold",
//               "data": {},
//               "children": []
//           }, {
//               "id": "elvis",
//               "name": "Elvis",
//               "data": {},
//               "children": []
//           }]
//       }, {
//           "id": "craig",
//           "name": "Craig",
//           "data": {},
//           "children": [{
//               "id":"arnold"
//           }]
//       }, {
//           "id": "amanda",
//           "name": "Amanda",
//           "data": {},
//           "children": []
//       }, {
//           "id": "phoebe",
//           "name": "Phoebe",
//           "data": {},
//           "children": []
//       }, {
//           "id": "spock",
//           "name": "Spock",
//           "data": {},
//           "children": []
//       }, {
//           "id": "matt",
//           "name": "Matthe",
//           "data": {},
//           "children": []
//       }],
//       "data": []
//   };
//   res.send(newFriends);
//});

// ace: routes call

// socket io setup for chat function
    const io = new Server(server);

    function sendTime() {
	    io.emit('message', {message: new Date().toJSON()});
    }

    setInterval(sendTime, 10000);

    io.on('connection', function(socket) {
		
        socket.on('chat message', function(obj){
			// call routes.sendMessage, which takes in obj and returns obj with timestamp appended!
			// input obj: { text: $('#message').val().trim(), sender: myID, room: room}
			routes.sendMessage(obj, (error, newobj) => {
				if (newobj != null) {
					io.to(obj.room).emit('chat message', newobj);
				} else {
					console.log(error);
					io.to(obj.room).emit('chat message', obj);
				}
			});
		});
		
		socket.on('permanent leave', function(obj){
			routes.sendMessage(obj, (error, newobj) => {
				if (newobj != null) {
					io.to(obj.room).emit('permanent leave', newobj);
				} else {
					console.log(error);
					io.to(obj.room).emit('permanent leave', obj);
				}
			});
		});
		
		socket.on('join room', obj => {
			socket.join(obj.room);
			console.log(obj.room);
		});
		
		socket.on('leave room', obj =>{
			socket.leave(obj.room);
		});
		
    });

/** moves to chat page: should have a list of user's chats, and a new chat room button. REFRESH every 3 seconds */
app.get('/chat', routes.loadChatPage);
app.post('/chatlist', routes.postChatList);
/** adds new chat to list, opens up chatroom, button to add friend, text input box + button to send text */
app.post('/createroom', routes.addChat);
/** opens up chatroom chosen from list; loads and outputs list of previous messages */
app.post('/openroom', routes.openChat);
app.post('/leaveroom', routes.leaveChat);
// open CHATBOX should REFRESH every 1 second. Chatbox should leave button
/** popup list of friends user can add to chat */
app.post('/friendstoadd', routes.popupFriends);
/** in chatroom box, button that allows adding a friend */
app.post('/addfriend', routes.addFriend);
/** send msg to database, refreshes page */
app.post('/sendmessage', routes.sendMessage);

/** reload list of chats */
app.get('/reloadchats', routes.reloadChats);
/** reload chat, by which I mean res.JSON list of messages to Frontend (look at my app.js /output for HW4)*/
app.get('/reloadroom', routes.reloadRoom);

/** if request is sent by chat admin, remove user from chat */
app.post('/removeuser', routes.removeUser);
/** given specific user's info, extract their info */
app.post('/extractuser', routes.extractUserInfo);

// end of ace

app.post('/handlerequest', routes.requestFilter);

// app.get('/news', null);

//AJAX Post
app.post('/ajaxpostsignup', routes.postCreateUser);
app.post('/ajaxpostlogin', routes.postLoginUser);
app.post('/ajaxgetwall', routes.postWallRefresh);
app.post('/ajaxsearchuser', routes.postScanUsers);
app.post('/ajaxsendfriendrequest', routes.postSendFriendRequest);
app.post('/ajaxgetfriends', routes.postGetFriend);
app.post('/ajaxedituser', routes.postEditUser);
app.post('/ajaxviewinvites', routes.viewRequests);
app.post('/ajaxacceptfriendinvite', routes.acceptFriendInvite);
app.post('/ajaxrejectfriendinvite', routes.rejectFriendInvite);
app.post('/ajaxpostmywall', routes.postmywall);
app.post('/ajaxrefreshmywall', routes.postMyWallRefresh);
app.post('/ajaxviewuserinfo', routes.postViewUserInfo);
app.post('/ajaxmakecomment', routes.makeCommentOnPost);
app.post('/ajaxviewfeed', routes.postViewFeed);

app.post('/ajaxremovefriend', routes.postRemoveFriend);

// news
app.get('/newsfeed', newsroutes.newsfeed);
app.get('/news', newsroutes.calculateRank);
app.post('/likeNews', newsroutes.addLike);
app.get('/searchNews', newsroutes.searchNews);

app.get('/logout', routes.getLogOut);

app.get('*', (req, res) => {
  res.render('404');
})

// app.listen(PORT, () => console.log(`Example app is listening on port ${PORT}`));
server.listen(PORT, () => console.log(`Example app is listening on port ${PORT}`));


