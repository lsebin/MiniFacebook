$(document).ready(() => {
    
});

function checkUser() {
    let username = $('#login-username').val();
    let password = $('#login-password').val();

    let userErr = document.createElement('ul');
    if (!username.match(/^\w{3,25}$/)) {
        userErr.innerHTML += "<li>Please enter a valid username.</li>";
    }
    if (!password.length > 0) {
        userErr.innerHTML += "<li>Please enter a valid password.</li>";
    }
    $('#login-clienterror').append(userErr);

    if (userErr.innerHTML.length == 0) {
        $.ajax({
            url: 'ajaxpostlogin',
            type: 'POST',
            async: true,
            datatype: 'json',
            data: {
                username: username,
                password: password,
            },
            success: (response) => {
                location.reload();
            },
            error: (error) => {
                let status = error.status;
                console.log(error);
                let serverErr = '';
                if (status == 401) {
                    serverErr = 'Incorrect username/password. Check your information.'
                } else if (status == 500) {
                    serverErr = '500: Internal Server Error.'
                }
                $('#login-servererror').html(`<p>${serverErr}</p>`)
            }
        })
    }
 }