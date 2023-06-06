const inputTooltipOptions = (msg) => {
    return {
        'trigger': 'focus',
        'placement': 'right',
        'title': msg
    }
}

$(document).ready(() => {
    $('#settings-username').tooltip(inputTooltipOptions('Limit 3-25 characters'));
    $('#settings-displayname').tooltip(inputTooltipOptions('Limit 3-25 characters'));
    $('#settings-password').tooltip(inputTooltipOptions('Password must be 8-40 characters. At least 1 letter, 1 number, and 1 special character'));
    $('#settings-firstname').tooltip(inputTooltipOptions('Limit 25 characters. Legal first name'));
    $('#settings-lastname').tooltip(inputTooltipOptions('Limit 25 characters. Legal last name'));
    $('#settings-email').tooltip(inputTooltipOptions('Valid emails only'));
    $('#settings-phone').tooltip(inputTooltipOptions('Valid phone numbers only'));
    $('#settings-interests').tooltip(inputTooltipOptions('Choose at least two news interests'));
    $('#settings-dob').tooltip(inputTooltipOptions('Must be at least 13 years of age'));
});

function editUser() {
    let user = {
        username: $('#settings-username').val(),
        displayname: $('#settings-displayname').val(),
        password: $('#settings-password').val(),
        firstname: $('#settings-firstname').val(),
        lastname: $('#settings-lastname').val(),
        affiliation: $('#settings-affiliation').val(),
        email: $('#settings-email').val(),
        phone: $('#settings-phone').val(),
        dob: $('#settings-dob').val(),
        interests: JSON.stringify($('#settings-interests').val()),
    };

    console.log(user);

    let userErr = document.createElement('ul');
    userErr.innerHTML = '';
    if (user.username.length > 0 && !user.username.match(/^\w{3,25}$/)) {
        userErr.innerHTML += "<li>Username unsupported. Limit 1 to 25 characters.</li>";
    }
    if (user.password.length > 0 && !user.password.match(/^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,40}$/)) {
        userErr.innerHTML += "<li>Password unsupported. Limit 8 to 40 characters. Must have 1 letter, 1 number, 1 special character.</li>";
    }
    if (user.email.length > 0 && !user.email.match(/^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/)) {
        userErr.innerHTML += "<li>Email error. Please enter in valid email.</li>";
    }
    if (user.firstname.length > 0 && !user.firstname.match(/^[A-Za-z-\s']{1,25}$/)) {
        userErr.innerHTML += "<li>First Name error. Please enter in legal first name</li>"
    }
    if (user.lastname.length > 0 && !user.lastname.match(/^[A-Za-z-\s']{1,25}$/)) {
        userErr.innerHTML += "<li>Last Name error. Please enter in legal last name</li>"
    }
    if (user.affiliation.length > 0 && !user.affiliation.match(/^[a-zA-Z0-9_ ]{1,40}$/)) {
        userErr.innerHTML += "<li>Affiliation error. Max 3-40 characters.</li>"
    }
    if (user.phone.length > 0 && !user.phone.match(/^[A-Z][a-z0-9_-]{1,25}$/)) {
        userErr.innerHTML += "<li>Phone error. Please enter valid phone number</li>"
    }
    if (user.interests.length > 0 && $('#settings-interests').val().length < 2) {
        userErr.innerHTML += "<li>Interests error. Please select more than 2 interests.</li>"
    }
    if (user.dob.length > 0) {
        let dobDate = new Date(user.dob);
        let today = new Date();
        if (!isNaN(dobDate) && dobDate < new Date("01-01-1900") 
            && dobDate > (today).setFullYear(today.getFullYear() - 13)) {
                userErr.innerHTML += "<li>Date of birth error. Must be 13 years or older.</li>"
        }
    }  
    $('#settings-clienterror').append(userErr);
    
    Object.entries(user).forEach(entry => {
        let [key, val] = entry;
        if (val.length < 1) {
            delete user[key];
        }
    });

    console.log(user);

    if (userErr.innerHTML.length == 0) {
        $.ajax({
            url: '/ajaxedituser',
            type: 'POST',
            async: true,
            datatype: 'json',
            data: {
                user: user
            },
            success: (response) => {
                console.log(response);
                location.reload();
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
                $("#settings-servererror").html(`<p>${serverErr}</p>`);
            }
        }); 
    }
}