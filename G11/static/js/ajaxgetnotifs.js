$(document).ready(() => {
    getInvites();
});

function getInvites() {
    $.ajax({
        url: '/ajaxviewinvites',
        type: 'POST',
        async: true,
        datatype: 'json',
        success: (response) => {
            console.log(response);
            let invites = response && response.length > 0 
                ? JSON.parse(response) : [];
            let target = $('#notificiations-friendinvites-target');
            invites.forEach(d => {
                let inviteDiv = document.createElement('div');
                inviteDiv.className = 'notif-invite';
                let info = document.createElement('div');
                info.className = 'notif-info';
                let actions = document.createElement('div');
                actions.className = 'notif-actions';

                let username = document.createElement('h1');
                username.innerText = d.asker;
                username.className = 'notif-username';

                let typename = document.createElement('p');
                typename.innerText = `Request ${d.type}`;
                typename.className = 'notif-typename';

                info.appendChild(username);
                info.appendChild(typename);

                let accept = document.createElement('button');
                accept.innerText = 'Accept'
                accept.onclick = () => {
                    processInvite(d.asker, d.type, true);
                    inviteDiv.style.display = "none";
                };
                accept.className = 'notif-accept';

                let reject = document.createElement('button');
                reject.innerText = 'Reject';
                reject.onclick = () => {
                    rejectFriendInvite(d.asker, d.type, false);
                    inviteDiv.style.display = "none";
                };
                reject.className = 'notif-reject';
                
                actions.appendChild(accept);
                actions.appendChild(reject); 

                inviteDiv.appendChild(info);
                inviteDiv.appendChild(actions);

                target.append(inviteDiv);
            });
        },
        error: (error) => {
            console.log(error);
        }
    });
}

function processInvite(asker, type, acceptance) {
    $.ajax({
        url: '/handlerequest',
        type: 'POST',
        async: true,
        datatype: 'json',
        data: {
            askerid: asker,
            type: type,
            acceptance: acceptance,
        },
        success: (response) => {
            console.log(response);
        },
        error: (error) => {
            console.log(error);
        }
    });
}
