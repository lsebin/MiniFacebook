function addFriend(username, callback) {
    console.log(username);
    $.ajax({
        url: 'ajaxsendfriendrequest',
        type: 'POST',
        async: true,
        datatype: 'json',
        data: {
            accepter: username
        },
        success: (response) => {
            callback(null, response);
        },
        error: (error) => {
            callback(error, null);
        }
    })
}

function getFriends(username, callback) {
    console.log(username);
    $.ajax({
        url: 'ajaxgetfriends',
        type: 'POST',
        async: true,
        datatype: 'json',
        data: {
            username: username
        },
        success: (response) => {
            callback(null, response);
        },
        error: (error) => {
            callback(error, null);
        }
    })
}