const inputTooltipOptions = (msg) => {
    return {
        'trigger': 'focus',
        'placement': 'right',
        'title': msg
    }
}

$(document).ready(() => {
    $('#signup-username').tooltip(inputTooltipOptions('Limit 3-25 characters'));
    $('#signup-password').tooltip(inputTooltipOptions('Password must be 8-40 characters. At least 1 letter, 1 number, and 1 special character'));
    $('#signup-firstname').tooltip(inputTooltipOptions('Limit 25 characters. Legal first name'));
    $('#signup-lastname').tooltip(inputTooltipOptions('Limit 25 characters. Legal last name'));
    $('#signup-affiliation').tooltip(inputTooltipOptions('Limit 3-40 characters'));
    $('#signup-email').tooltip(inputTooltipOptions('Valid emails only'));
    $('#signup-dob').tooltip(inputTooltipOptions('Must be at least 13 years of age'));
    $('#signup-interests').tooltip(inputTooltipOptions('Must select at least two interests'));
});

function createUser() {
    let user = {
        username: $('#signup-username').val(),
        password: $('#signup-password').val(),
        firstname: $('#signup-firstname').val(),
        lastname: $('#signup-lastname').val(),
        affiliation: $('#signup-affiliation').val(),
        email: $('#signup-email').val(),
        dob: $('#signup-dob').val(),
        timestamp: (new Date()).toString(),
        interests: JSON.stringify($('#signup-interests').val())
    };

    console.log(user.dob);

    let userErr = document.createElement('ul');
    if (!user.username.match(/^\w{3,25}$/)) {
        userErr.innerHTML += "<li>Username unsupported. Limit 1 to 25 characters.</li>";
    }
    if (!user.password.match(/^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,40}$/)) {
        userErr.innerHTML += "<li>Password unsupported. Limit 8 to 40 characters. Must have 1 letter, 1 number, 1 special character.</li>";
    }
    if (!user.email.match(/^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/)) {
        userErr.innerHTML += "<li>Email error. Please enter in valid email.</li>";
    }
    if (!user.firstname.match(/^[A-Za-z-\s']{1,25}$/)) {
        userErr.innerHTML += "<li>First Name error. Please enter in legal first name</li>"
    }
    if (!user.lastname.match(/^[A-Za-z-\s']{1,25}$/)) {
        userErr.innerHTML += "<li>Last Name error. Please enter in legal last name</li>"
    }
    if (!user.affiliation.match(/^[a-zA-Z0-9_ ]{1,40}$/)) {
        userErr.innerHTML += "<li>Affiliation error. Please input your affiliation. Max 40 characters."
    }
    if ($('#signup-interests').val().length < 2) {
        userErr.innerHTML += "<li>Interests error. Please select at least two.</li>"
    }

    let dobDate = new Date(user.dob);
    let today = new Date();
    if (!isNaN(dobDate) && dobDate < new Date("01-01-1900") 
        && dobDate > (today).setFullYear(today.getFullYear() - 13)) {
            userErr.innerHTML += "<li>Date of birth error. Must be 13 years or older.</li>"
    }
    $('#signup-clienterror').append(userErr);
    
    console.log(userErr.innerHTML.length);

    if (userErr.innerHTML.length == 0) {
        $.ajax({
            url: '/ajaxpostsignup',
            type: 'POST',
            async: true,
            datatype: 'json',
            data: {
                user: user
            },
            success: (response) => {
                console.log(response);
                window.location.href = "/wall";
            },
            error: (error) => {
                let status = error.status;
                console.log(error);
                let serverErr = '';
                if (status == 401) {
                    serverErr = 'User not accepted. Please check your information.'
                } else if (status == 403) {
                    serverErr = 'Username or email already exists. Please use different username or email'
                } else if (status == 500) {
                    serverErr = '500: Internal Server Error.'
                } 
                $("#signup-servererror").html(`<p>${serverErr}</p>`);
            }
        }); 
    }
}
