$(document).ready(() => {
    searchUser($('#search-query').text());
});

function searchUser(query) {
    $.ajax({
        url: '/ajaxsearchuser',
        type: 'POST',
        async: true,
        datatype: 'json',
        data: {
            query: query
        },
        success: (response) => {
            console.log(response);
            let [results, user] = JSON.parse(response);

            console.log(JSON.parse(response));

            let requests = user.sentRequests ? JSON.parse(user.sentRequests) : [];
            let friends = user.friends ? JSON.parse(user.friends) : [];
            
            let resultsDiv = document.createElement('div');
            results.forEach(d => {
                let userResult = document.createElement('div');
                let userDisplayName = document.createElement('a');
                userDisplayName.href = '/mywall/' + d.username;
                let userUserName = document.createElement('p');

                let userAddFriendButton = document.createElement('button');
                if (d.username == user.username) {
                    userAddFriendButton.disabled = true;
                    userAddFriendButton.innerText = "You";
                } else if (friends && friends.includes(d.username)) {
                    userAddFriendButton.innerText = "Remove Friend";
                    userAddFriendButton.onclick = () => {
                        console.log(d.username);
                        removeFriend(d.username, (err, response) => {
                            if (err) {
                                console.log(err);
                            } else {
                                console.log(response);
                            }
                        });
                        userAddFriendButton.innerText = 'Add Friend';
                        userAddFriendButton.onclick = () => {
                            addFriend(d.username, (err, response) => {
                                if (err) {
                                    console.log(err);
                                } else {
                                    console.log(response);
                                }
                            });
                            userAddFriendButton.disabled = true;
                            userAddFriendButton.innerText = 'Request Sent';
                            console.log(userAddFriendButton.disabled);
                        };
                    };
                } else if (requests && requests.includes(d.username)) {
                    userAddFriendButton.disabled = true;
                    userAddFriendButton.innerText = "Request Sent";
                } else {
                    userAddFriendButton.innerText = `Add Friend`;
                    userAddFriendButton.onclick = () => {
                        addFriend(d.username, (err, response) => {
                            if (err) {
                                console.log(err);
                            } else {
                                console.log(response);
                            }
                        });
                        userAddFriendButton.disabled = true;
                        userAddFriendButton.innerText = 'Request Sent';
                    };
                }
                
                userDisplayName.innerHTML = `<h3>${d.displayname}</h3>`;
                userUserName.innerText = '@' + d.username;

                userResult.appendChild(userDisplayName);
                userResult.appendChild(userUserName);

                resultsDiv.appendChild(userResult);
                resultsDiv.appendChild(userAddFriendButton);
            });

            $('#search-results-target').append(resultsDiv);


        },
        error: (error) => {
            console.log(error);
            // tell error if search
        }
    })
}

function removeFriend(victim) {
    $.ajax({
        url: '/ajaxpostmywall',
        type: 'POST',
        async: true,
        datatype: 'json',
        data: {
            victim: victim
        },
        success: (response) => {
            location.reload();
        },
        error: (error) => {
            console.log(error);
        }
    });
}