$(document).ready(() => {
    let target = $('#friends-target');
    $.ajax({
        url: '/ajaxgetfriends',
        type: 'POST',
        async: true,
        datatype: 'json',
        data: {
            username: 'username'
        },
        success: (response) => {
            let friends = JSON.parse(response);
            
            friends.forEach(d => {
                let friendSlot = document.createElement('div');
                let friendTitle = document.createElement('h3');

                friendTitle.innerText = d;
                friendSlot.appendChild(friendTitle);
                target.append(friendSlot);
            });
        },
        error: (error) => {
            console.log(error);
            target.text('500: Internal Server Error');
        }
    })
});