const { sendStatus } = require('express/lib/response');
const usr = require('../models/user');
const db = require('../models/database');
const newsdb = require('../models/newsdatabase');
const user = require('../models/user');
const e = require('express');
const {v4 : uuidv4} = require('uuid');
const bcrypt = require("bcrypt");

/**
 * Checks if HTTP Status code is successful (between 200-299)
 * @param {int} status 
 * @returns true if status is successful http code
 */
const isSuccessfulStatus = (status) => {
  return status < 300 && status >=200;
}

const getSplash = (req, res) => {
  if (req.session && req.session.user) {
    res.redirect('/wall');
  } else {
    res.render('splash');
  }
}

const getSignUp = (req, res) => {
  db.scanNewsCategories((status, err, data) => {
    if (isSuccessfulStatus(status)) {
      res.render('signup', {newsCategories: data});
    } else {
      res.redirect('/error');
    }
  });
}

const getLogin = (req, res) => {
  if (req.session && req.session.user) {
    res.redirect('/wall');
  } else {
    res.render('login');
  }
}

const getWall = (req, res) => {
  if (req.session && req.session.user) {
    res.render('wall', {username: req.session.user.username});
  } else {
    res.redirect('/login');
  }
}

const getSearchUser = (req, res) => {
  if (req.session && req.session.user) {
    console.log(req.query);
    if (req.query.term) {
      res.render('search', {query: req.query.term});
    } else {
      res.redirect('/error');
    }
  } else {
    res.redirect('/login');
  }
}

const getFriends = (req, res) => {
  if (req.session && req.session.user) {
    res.render('friends');
  } else {
    res.redirect('/login');
  }
}

const getSettings = (req, res) => {
  if (req.session && req.session.user) {
    let user = req.session.user;
    db.scanNewsCategories((status, err, data) => {
      if (isSuccessfulStatus(status)) {
        res.render('settings', {user: user, newsCategories: data});
      } else {
        res.redirect('/error');
      }
    });
  } else {
    res.redirect('/login');
  }
}

const getMyWall = (req, res) => {
  let homeUser = req.params.username;
  if (req.session && req.session.user) {
    if (homeUser != req.session.user.username) {
      db.querySingleUser(homeUser, (status, err, data) => {
        if (isSuccessfulStatus(status)) {
          console.log(data);
          let homefriends = data.friends ? JSON.parse(data.friends) : [];
          let canPost = homefriends.includes(req.session.user.username);
          res.render('mywall', {userwall: homeUser, canPost: canPost});
        } else {
          res.redirect('/error');
        }
      });
    } else {
      res.render('mywall', {userwall: homeUser, canPost: true});
    }
  } else {
    res.redirect('/login');
  }
}

const getNotifications = (req, res) => {
  console.log(req.session.user);
  if (req.session && req.session.user) {
    res.render('notifications');
  } else {
    res.redirect('/login');
  }
}

const getLogOut = (req, res) => {
  if (req.session && req.session.user) {
    req.session.destroy();
    res.redirect('/');
  } else {
    res.redirect('/login');
  }
}

const postViewFeed = (req, res) => {
  if (req.session && req.session.user) {
    db.querySingleUser(req.session.user.username, (status, err, data) => {
      if (isSuccessfulStatus(status)) {
        let userFriends = data.friends && data.friends.length > 0
          ? JSON.parse(data.friends) : [];
        req.session.user = data;
        db.viewFeed(req.session.user.username, userFriends, (status, err, data) => {
          if(isSuccessfulStatus(status)) {
            res.status(201).send(data);
          } else {
            res.status(status).send(new Error(err));
          }
        });
      } else {
        res.status(status).send(new Error(err));
      }
    });
  } else {
    res.status(401).send(new Error("No user"));
  }
}

const viewUserInfo = (req, res) => {
  let queryuser = req.body.queryuser;
  if (req.session && req.session.user) {
    db.querySingleUser(queryuser, (status, err, data) => {
      if (isSuccessfulStatus(status)) {
        res.status(201).send(data);
      } else {
        res.status(status).send(new Error(err));
      }
    })
  } 
}

const viewRequests = (req, res) => {
  if (req.session && req.session.user) {
    db.queryRequests(req.session.user.username, false, (status, err, data) => {
      if (isSuccessfulStatus(status)) {
        res.send(JSON.stringify(data));
      } else {
        res.status(status).send(new Error(err));
      }
    });
  } else {
    res.status(401).send(new Error("No user"));
  }
}

const makeCommentOnPost = (req, res) => {
  if (req.session && req.session.user) {
    let userwall = req.body.userwall;
    let postuuid = req.body.postuuid;
    let commenter = req.session.user.username;
    let text = req.body.commentText;
    console.log(userwall);
    console.log(postuuid);
    console.log(commenter);
    console.log(text);
    db.addCommentToPost(userwall, postuuid, commenter, text, (status, err, data) => {
      if (isSuccessfulStatus(status)) {
        res.status(201).send(data);
      } else {
        res.status(status).send(new Error(err));
      }
    });
  } else {
    res.status(401).send(new Error("No user"));
  }
}

const postRemoveFriend = (req, res) => {
  let remover = req.session.user.username;
  let victim = req.body.victim;

  if (req.session && req.session.user) {
    db.deleteFriend(remover, victim, (status, err, data) => {
      if (isSuccessfulStatus(status)) {
        res.status(201).send(data);
      } else {
        res.status(status).send(new Error(err));
      }
    })
  } else {
    res.status(401).send(new Error("No user"));
  }
}

const rejectFriendInvite = (req, res) => {
  let asker = req.body.asker;
  if (req.session && req.session.user) {
    if (typeof asker == 'string') {
      db.rejectFriendInvite(req.session.user.username, asker, (status, err, data) => {
        if (isSuccessfulStatus(status)) {
          res.sendStatus(201);
        } else {
          res.status(status).send(new Error(err));
        }
      });
    } else {
      res.status(403).send(new Error("Not a string"));
    }
  } else {
    res.status(401).send(new Error("No user"));
  }
}

const acceptFriendInvite = (req, res) => {
  let asker = req.body.asker;
  if (req.session && req.session.user) {
    if (typeof asker == 'string') {
      db.acceptFriendInvite(req.session.user.username, asker, (status, err, data) => {
        if (isSuccessfulStatus(status)) {
          db.postMyWall(req.session.user.username, req.session.user.username,
            `${req.session.user.username} just accepted a friend request from ${asker}`, 
            (status, err, data) => {
              if (isSuccessfulStatus(status)) {
                db.postMyWall(asker, asker,
                  `${asker} is now friends with ${req.session.user.username}`, 
                  (status, err, data) => {
                    if (isSuccessfulStatus(status)) {
                      res.status(201).send(data);
                    } else {
                      res.status(status).send(new Error(err));
                    }
                  });
              } else {
                res.status(status).send(new Error(err));
              }
            });
        } else {
          res.status(status).send(new Error(err));
        }
      });
    } else {
      res.status(403).send(new Error("Not a string"));
    }
  } else {
    res.status(401).send(new Error("No user"));
  }
}

const postmywall = (req, res) => {
  if (req.session && req.session.user) {
    let text = req.body.text;
    let currentwall = req.body.userwall;
    db.postMyWall(currentwall, req.session.user.username, text, (status, error, data) => {
      if (isSuccessfulStatus(status)) {
        res.status(201).send(JSON.stringify(data));
      } else {
        res.status(status).send(new Error(err));
      }
    });
  } else {
    res.status(400).send(new Error("No User"));
  }
}

const postScanUsers = (req, res) => {
  let query = req.body.query;

  if (query && query.length > 2) {
    db.scanUsers(query, (status, err, data) => {
      if (isSuccessfulStatus(status)) {
        res.send(JSON.stringify([data, req.session.user]));
      } else {
        res.status(500).send(new Error(err));
      }
    });
  } else {
    res.status(400).send(new Error("No Query"));
  }
}

const postGetFriend = (req, res) => {
  let username = req.session.user.username;
  
  if (username && username.match(/^\w{3,25}$/)) {
    db.getFriends(username, (status, err, data) => {
      if (isSuccessfulStatus(status)) {
        let cleanData = data.map(d => {
          return d.accepter.S == username ? d.asker.S : d.accepter.S
        });
        res.send(JSON.stringify(cleanData));
      } else {
        res.status(status).send(new Error(err));
      }
    });
  }
}

const postSendFriendRequest = (req, res) => {
  let accepter = req.body.accepter;

  if (accepter && accepter.match(/^\w{3,25}$/)) {
    db.sendFriendRequest(req.session.user.username, accepter, (status, err, data) => {
      if (isSuccessfulStatus(status)) {
        req.session.user.sentRequests = data;
        res.sendStatus(201);
      } else {
        res.status(status).send(new Error(err));
      }
    });
  } else {
    res.status(401).send(new Error("Unsupported username"));
  }
}

const postMyWallRefresh = (req, res) => {
  let userwall = req.body.userwall;

  if (req.session && req.session.user) {
    db.queryPosts(userwall, (status, err, data) => {
      if (isSuccessfulStatus(status)) {
        res.send(JSON.stringify(data));
      } else {
        res.status(status).send(new Error(err));
      }
    });
  } else {
    res.status(401).send(new Error("No user signed in"));
  }
}

const postWallRefresh = (req, res) => {
  if (req.session && req.session.user) {
  } else {
    res.status(401).send(new Error("No user signed in"));
  }
}

const postLoginUser = (req, res) => {
  let username = req.body.username;
  let password = req.body.password;

  if (req.session && req.session.user) {
    res.status(403).send(new Error("User already signed in"));
  } else {
    db.loginUser(username, password, (status, err, data) => {
      if (isSuccessfulStatus(status)) {
        let user = data.Items[0];
        Object.entries(data.Items[0]).forEach(d => {
          let [key, val] = d;
          user[key] = val.S;
        });
        req.session.user = user;
        res.redirect('/wall');
      } else {
        res.status(status).send(new Error(err));
      }
    }); 
  }
}

const postEditUser = (req, res) => {
  if (req.session.user && req.body.user) {
    let newUserInfo = req.body.user;
    let currUser = structuredClone(req.session.user);

    Object.entries(newUserInfo).forEach(entry => {
      let [key, val] = entry;
      currUser[key] = val;
    });
    
    db.editUser(currUser, 
      newUserInfo.username, 
      newUserInfo.email, 
      (status, err, data) => {
      if (isSuccessfulStatus(status)) {
        req.session.user = currUser;
        db.addInterests(currUser.username, JSON.parse(currUser.interests), (status, err, data) => {
          if (isSuccessfulStatus(status)) {
            // newsdb.runSpark(currUser, (err, data) => {
            //   if (err) {
            //     res.status(500).send(new Error(err));
            //   } else { 
            //     newsdb.changeInterest(currUser, (err, data) => {
            //       if (err) {
            //         res.status(500).send(new Error(err));
            //       } else {
            //         res.status(201).send(data);
            //       }
            //     });
            //   }
            // });
          } else {
            res.status(status).send(new Error(err));
          }
        });
      } else {
        res.status(status).send(new Error(err));
      }
    });
    
  } else {
    res.status(401).send(new Error("Invalid user input"));
  }
}

const postCreateUser = (req, res) => {
  let user = req.body.user;
  if (user && usr.checkUser(user)) {
    db.createUser(user, (status, err, data) => {
      if (isSuccessfulStatus(status)) {
        req.session.user = user;
        console.log(user.interests);
        db.addInterests(user.username, JSON.parse(user.interests), (status, err, data) => {
          if (isSuccessfulStatus(status)) {
            //  newsdb.runSpark(user, (err, data) => {
            //    if (err) {
            //      res.status(500).send(new Error(err));
            //    } else { 
            //      res.status(201).send(data);
            //    }
            //  });
            res.status(201).send(data);
          } else {
            res.status(status).send(new Error(err));
          }
        });
      } else {
        res.status(status).send(new Error(err));
      }
    });
  } else {
    res.status(401).send(new Error('Invalid user input'));
  }
}

// ace: routes
/**
  input: req, res
  function: calls on database method to create new chatroom with a friend
 */
const getChat = (req, res) => {
	// call user from req.session.user
	let user = req.session.user;
	
	if (req.session.user != null) {
		res.render('chats');
	} else {
		// not logged in, return to homepage & log reason on console
		res.redirect('/');
	}
}

const sendChatList = (req, res) => {
  let username = req.session.user.username;
  db.findChats(username, (err, data) => {
	if(data != null) {
		if (data.length == 0 || data == "[]" || data == []) {
			var obj = {'clist' : [], 'username': username};
			res.send(obj);
		} else {
			var obj = {'clist' : JSON.parse(data), 'username': username};
			res.send(obj);
		}
	} else {
		console.log(err);
	}
  });
}

/**
  input: req, res
  function: adds new chat to database, opens up in chatbox
  if error: send error message to session, console error
 */
const addChat = (req, res) => {
	// if user is logged in, continue
	// generate a new chatroom item (using db), save to req.session.currentroom
	// also send data to frontend
	if (req.session.user.username != null) {
		let user = req.session.user;
		// generate uuid
		let roomid = uuidv4();
		
		let chatinfo = {
			creator : user.username,
			chatname : req.body.chatnameinput,
			roomid : roomid,
		};
		
		// call newChat function
		db.newChat(chatinfo, (status, err, data) => {
			// return chatinfo = {roomid: value, chatname: chat name, }
			if (status != 200) {
				console.log(status);
				console.log(err);
				if (status == 500) {
					return res.status(status).send(new Error(err));
				} else {
					return res.sendStatus(status);
				}
			} else {
				// set req.session.currentroom = { id: room-uuid, name: chatname, creator: req.session.user }
				req.session.currentroom = data.roomid;
				return res.send(data);
			}
		});
		// KEVIN: on frontend we need to call reloadData on the chatlist div after addChat 
	} else {
		// not logged in, return to homepage & log reason on console
		console.log("Not logged in, returned to homepage.");
		res.render('splash');
	}
}

/***
 * function: pops up list of friends that (on frontend) you can click on to add a user's friend to the chat
 * if error: console error
 * @params input: send current username (check session), 
 * @params output: res.json();
 */
const viewFriends = (req, res) => {
	// if user exists
	// display list of friends, called when click on invite friend button
	// on frontend, if req.session.friendslist != null then display a popup / container
	// otherwise, display No friends 
	
	if (req.session.user != null && req.session.user.username != '') {
		let username = req.session.user.username;
		let chatid = req.body.roomid;
		
		db.getFriendsList(username, chatid, (status, err, data) => {
			if (status != 200) {
				if (err) {
					console.log(err)
					res.status(status).send(new Error(err));
				} else {
					res.sendStatus(status);
				}
			} else {
				console.log("query success");
				res.json(data);
			}
		});
	} else {
		// not logged in, return to homepage & log reason on console
		console.log("Not logged in, returned to homepage.");
		res.redirect('/');
	}
	
}

/**
  input: req, res
  function: sends chat invite to friend
  if error: send error message to session, console error
 */
const addFriend = (req, res) => {
	// if user exists
	let friend = req.body.friendusername;
	let chatid = req.body.roomid;
	
	console.log("Sending invite to: " + friend + " for chat " + chatid);
	// on click, send request to add friend to db using addFriendToChat
	db.addFriendToChat(friend, chatid, (status, err, data) => {
		if (status != 200) {
			if (err) {
				console.log(err);
			}
			return res.sendStatus(status);
		} else {
			console.log(data);
			return res.send("Success!");
		}
	});
	// set req.session.friendslist == null
	// to KEVIN: on frontend, is there a way to close the friendslist popup?
}

/**
  input: req, res
  function: calls on method to open up chatroom
  if error: 
 */
const openChat = (req, res) => {
	// upon clicking one of chats in list, open chatbox in side of screen
	// set req.session.currentroom = { id: room-uuid, name: chatname, creator: creator}
	
	const room = req.body.room;
	req.session.currentroom = room;
	console.log(req.body.room);
	
	// we need functionality so that on click of a chatroom listed it sends openChat request with req.body.chattoopen variable plz 
	// PS: we need to refresh chatbox every 1 second
	db.viewChat(room, (status, err, data) => {
		if (status != 200) {
			console.log(err);
			res.sendStatus(status);
		} else {
			const ansr = data.pastmessages.map( rawmessage => {
					return { sender: rawmessage.sender.S, 
								text: rawmessage.text.S,
								timestamp: rawmessage.timestamp.S,
								date: new Date(rawmessage.timestamp.S)};
				}).sort( function(a, b){ return (a.date - b.date);});
			
			res.send({
				success: true,
				pastmessages: ansr,
				chatmembers: data.chatmembers,
			});
		}
	});
}

/**
  input: req, res
  function: removes current user from chatroom
  if error: send error message to session, console error
 */
const leaveChat = (req, res) => {
	// return res.send true?
	req.session.currentroom = null;
	/* if success: return res.send({
		success: true
	});
	*/
	
	res.send({
		success: true
	});
}

/**
  input: req, res
  function: sends message to current chatroom
  if error: 
 */
var sendMsg = function (obj, callback) {
	// input obj: { text: $('#message').val().trim(), sender: myID, room: room}
	// save message to database: 
	// generate timestamp
	// create new obj
	// send new messageobj to db
	const gmtTimeStamp = new Date().toUTCString();
	const msgid = uuidv4();
	
	let messageobj = {
		room: obj.room,
		messageid: msgid,
		text: obj.text,
		sender: obj.sender,
		timestamp: gmtTimeStamp
	}
	
	db.saveMessage(messageobj, (status, err, data) => {
		if (status != 200) {
			console.log(err);
			callback(err, null);
		} else {
			callback(err, messageobj);
		}
	});
	
}

const reloadMsgs = (req, res) => {
	// res.json list of messages every 10 seconds
}

const reloadChats = (req, res) => {
	// res.json list of user's active chats
	// reload chats when we add a chat OR when accept chat invite
}

/**
  input: req, res
  function: SHOULD ONLY BE POSSIBLE IF CREATOR, removes specific user from chatroom
  if error: send error message to session, console error
 */
const removeUser = (req, res) => {
	// remove user from chat data, remove chat from user's list of chatrooms,
	// if chat has no more users, delete chat
	let chatid = req.body.roomid;
	let username = req.session.user.username;
	console.log("here");
	db.removeUser(username, chatid, (status, err, data) => {
		if (status != 200) {
			res.sendStatus(status);
		} else {
			console.log("Succeeded in Deletion!");
			res.send({data: data, success: true});
		}
	});
}

/***
 * @params input: { username }, output: {userid: username, display: }
 */
const extractUserInfo = (req, res) => {
	// if displayname 
	// output from db: {userid: username, displayname: userdisplay, fullname: userfullname}
	// iff displayname == '', display = fullname, otherwise = displayname
	let usr = req.body.username;
	console.log("extracting user info");
	
	db.extractOneUserDisplayInfo(usr, (status, err, data) => {
		if (status != 200) {
			console.log(err);
			res.sendStatus(status);
		} else {
			if (data[0].displayname == '') {
				res.json({ status: 200, username: usr, display: data[0].fullname });
			} else {
				res.json({ status: 200, username: usr, display: data[0].displayname });
			}
		}
	});
}

/***
 * @params expected input from body / ajax: { askerid, acceptance } (actually will be chat invite's chat code)
 */
const acceptChatInvite = (req, res) => {
	let chatid = req.body.askerid;
	let acceptance = req.body.acceptance;
	let username = req.session.user.username;
	
	
	if (acceptance == true || acceptance == 'true') {
		console.log("We want to accept the invite");
		db.acceptChatInvite(chatid, username, (status, err, data) => {
			if (status != 200) {
				if (err) {
					console.log(err);
				}
				res.sendStatus(status);
			} else {
				res.send(data);
			}
		});
	} else {
		console.log("We want to reject the invite");
		db.declineChatInvite(chatid, username, (status, err, data) => {
			if (status != 200) {
				if (err) {
					console.log(err);
				}
				res.sendStatus(status);
			} else {
				res.send(data);
			}
		});
	}
}
/*** 
 * if req.body.type === "chat", call acceptChatInvite. if === "friend" call acceptFriendInvite
 */
const requestFilter = (req, res) => {
	let type = req.body.type;
  req.body.username = req.session.user.username;

	if (req.session.user && req.session.user.username) {
    if (type == null) {
      res.status(400).send(new Error("type not here"));
    } else {
      if (type === "chat") {
        acceptChatInvite(req, res);
      } else if (type === "friend") {
        processFriendInvite(req, res);
      } else {
        res.status(400).send(new Error("type error"));
      }
    }
  } else {
    res.status(401).send(new Error("no user"));
  }
}

// end of Ace
/***
 * @params expected input from body / ajax: { askerid } (asker user's username)
 */
const processFriendInvite = (req, res) => {
  req.body.asker = req.body.askerid;
  if (req.body.acceptance) {
    acceptFriendInvite(req, res);
  } else {
    rejectFriendInvite(req, res);
  }
}

// Kevin visualizer routes
const getVisualizer = (req, res) => {
  res.render('visualizer.pug')
}

// constant holding the friends of the session user
var affiliation = null;

const sendInitialVisualization = (req, res) => {
  console.log("Made it to sendInitialVisualization!");
  if (req.session.user != null) {
    console.log("req.session.user = " + req.session.user.username); //req.query.user or req.session.user???

    db.scanUsers(req.session.user.username, (status, err, user) => {
      if (!isSuccessfulStatus(status)) {
        res.status(500).send(new Error(err));

      } else {
        console.log('Else statement user: ' + user[0].username);
        console.log('Else statement user affiliation: ' + user[0].affiliation);
        affiliation = user[0].affiliation;
        db.getFriends(user[0].username, (statuscode, err, data) => {
          if (err) {
            console.log("Status code: " + statuscode);
            console.log(err);
          } else {
            console.log("Made it to else statement!");
            console.log(data);
            const datajson = {
              "id": user[0].username,
              "name": user[0].username,
              "data": {},
              "children": [],
            };
            console.log(data);
            for (const friend of data) {
              datajson.children.push({
                "id": friend.username, //should be username.S
                "name": friend.username, //should be displayname.S
                "data": {},
                "children": []
              });
            }
            res.send(JSON.stringify(datajson));
          }
        })

      }
    });
  } else {
    console.log("Not logged in, returned to homepage.");
		res.redirect('splash.pug');
  }
}

const sendVisualizerUser = (req, res) => {
  if (req.session.user != null) {
    console.log("sendVisualizerUser: " + req.session.user.username);
    affiliation = null;
    res.send({user: req.session.user});
  } else {
    affiliation = null;
    res.redirect('/');
  }
}

const sendFriends = (req, res) => {
  console.log("Made it to sendFriends!");
  console.log("Req.params.user: " + req.params.user);

  if (req.session.user != null) {
    db.scanUsers(req.params.user, (status, err, user) => {
      if (!isSuccessfulStatus(status)) {
        res.send({}); //status(500).send(new Error(err));

      } else {
        console.log('Else statement of sendFriends user: ' + user[0].username);
        db.getFriends(user[0].username, (statuscode, err, data) => {
          if (err) {
            console.log("Status code: " + statuscode);
            console.log(err);
          } else {
            console.log("Made it to else statement of sendFriends!");
            console.log(data);

            console.log("User: " + user[0].displayname);

            const datajson = {
              "id": user[0].username,
              "name": user[0].displayname,
              "data": {},
              "children": [],
            };

            for (const friend of data) {
              console.log("Friend: " + friend.status.S);
              console.log("Friend Affiliation: " + friend.affiliation.S);
              console.log("Session Affiliation: " + affiliation);
              if (friend.status.S == 'true' && (friend.affiliation.S == affiliation)) { //if status is bool delete
                datajson.children.push({
                  "id": friend.username.S, //should be username.S
                  "name": friend.displayname.S, //should be displayname.S
                  "data": {},
                  "children": []
                });
              }
            }
            res.send(JSON.stringify(datajson));
          }
        })

      }
    });
  } else {
    console.log("Not logged in, returned to homepage.");
		res.redirect('splash.pug');
  }
}

const routes = {
  getSplash: getSplash,

  // Login, account creation
  getLogin: getLogin,
  getSignUp: getSignUp,
  getWall: getWall,
  getSearchUser: getSearchUser,
  getFriends: getFriends,
  getSettings: getSettings,
  getMyWall: getMyWall,
  getNotifications: getNotifications,
  
  // ace: To Commit
  loadChatPage: getChat,
  postChatList: sendChatList,
  addChat: addChat,
  popupFriends: viewFriends,
  addFriend: addFriend,
  openChat: openChat,
  sendMessage: sendMsg,
  leaveChat: leaveChat,
  removeUser: removeUser,
  extractUserInfo: extractUserInfo,
  
  reloadRoom: reloadMsgs,
  reloadChats: reloadChats,
  acceptChatInvite: acceptChatInvite,
  
  requestFilter: requestFilter,
  // end of ace's routes

  postCreateUser: postCreateUser,
  postEditUser: postEditUser,
  postLoginUser: postLoginUser,
  postWallRefresh: postWallRefresh,
  postScanUsers: postScanUsers,
  postViewUserInfo: viewUserInfo,

  postSendFriendRequest: postSendFriendRequest,
  postGetFriend: postGetFriend,
  viewRequests: viewRequests,
  acceptFriendInvite: acceptFriendInvite,
  rejectFriendInvite: rejectFriendInvite,
  postRemoveFriend: postRemoveFriend,

  postmywall: postmywall,
  postMyWallRefresh: postMyWallRefresh,
  makeCommentOnPost: makeCommentOnPost,
  postViewFeed: postViewFeed,

  // Kevin's visualizer routes
  getVisualizer: getVisualizer,
  sendInitialVisualization: sendInitialVisualization,
  sendFriends: sendFriends,
  sendVisualizerUser: sendVisualizerUser,

  getLogOut: getLogOut,
}

module.exports = routes;