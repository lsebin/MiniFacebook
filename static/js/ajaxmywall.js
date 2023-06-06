let userwall;
let posts = [];
let letInput = false;

$(document).ready(() => {
    userwall = $('#mywall-userwall-target').text();
    getPosts();
});

function newPosts(inputPosts) {
    let addPosts = inputPosts.filter(np => {
        let isIn = false;
        posts.forEach(p => {
            if (p.postuuid == np.postuuid) {
                isIn = true;
            }
        });
        return !isIn;
    });
    let sortedAddPosts = addPosts.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    posts.unshift(...sortedAddPosts);
    return sortedAddPosts;
}

function sendPost() {
    let inputText = $('#mywall-inputtarget').val();
    if (inputText.length < 300 && inputText.length > 0) {
        $.ajax({
            url: '/ajaxpostmywall',
            type: 'POST',
            async: true,
            datatype: 'json',
            data: {
                userwall: userwall,
                text: inputText
            },
            success: (response) => {
                $('#mywall-inputtarget').val('');
                getPosts();
            },
            error: (error) => {
                console.log(error);
            }
        });
    } else {
        $('#mywall-errortarget').text("Error: post must not exceed 300 characters");
    }
}

function getPosts() {
    $.ajax({
        url: '/ajaxrefreshmywall',
        type: 'POST',
        async: true,
        datatype: 'json',
        data: {
            userwall: userwall,
        },
        success: (response) => {
            let postTarget = $('#mywall-post-target');
            let queriedPosts = response && response.length > 0
                ? JSON.parse(response) : [];
            
            let addPosts = newPosts(queriedPosts);

            let postNone = document.createElement('p');
            postNone.innerText = 'No posts';
            
            if (posts.length < 1) {
                postTarget.append(postNone);
            } else {
                addPosts.forEach(d => {
                    let postContent = document.createElement('div');
                    postContent.className = "mywall-postcontent";

                    let poster = document.createElement('h1');
                    poster.innerText = d.poster;
                    poster.className = "mywall-postposter";
                    
                    let text = document.createElement('p');
                    text.innerText = d.text;
                    text.className = "mywall-posttext";

                    let time = document.createElement('p');
                    time.innerText = d.timestamp;
                    time.className = "mywall-posttime";

                    let commentArr = d.comments && d.comments.length > 0
                        ? JSON.parse(d.comments) : [];
                    
                    let commentSection = document.createElement('div');
                    let commentHeader = document.createElement('h3');
                    commentHeader.innerHTML = "Comments"
                    commentSection.appendChild(commentHeader);

                    commentSection.className = 'mywall-commentsection'
                    commentArr.forEach(c => {
                        let comment = document.createElement('div');
                        comment.className = 'mywall-comment';

                        let commenter = document.createElement('h3');
                        commenter.className = 'mywall-commenter';

                        commenter.innerText = c.commenter;

                        let commentText = document.createElement('p');
                        commentText.className = 'mywall-commentText';

                        commentText.innerText = c.text;

                        comment.appendChild(commenter);
                        comment.appendChild(commentText);

                        commentSection.appendChild(comment);
                    });

                    let commentTextInput = document.createElement('textarea');
                    commentTextInput.id = 'mywall-comment-input-' + d.postuuid;
                    let commentSubmit = document.createElement('button');
                    commentSubmit.innerText = 'Post Comment';
                    commentSubmit.onclick = () => {
                        postComment(d.postuuid, commentTextInput.value);
                    };

                    commentSection.appendChild(commentTextInput);
                    commentSection.appendChild(commentSubmit);

                    postContent.appendChild(poster);
                    postContent.appendChild(text);
                    postContent.appendChild(time);
                    postContent.appendChild(commentSection);

                    postTarget.prepend(postContent);
                });
            }
        },
        error: (error) => {
            console.log(error);
        }
    });
}

function postComment(postuuid, text) {
    $.ajax({
        url: '/ajaxmakecomment',
        type: 'POST',
        async: true,
        datatype: 'json',
        data: {
            userwall: userwall,
            postuuid: postuuid,
            commentText: text,
        },
        success: (response) => {
            location.reload();
        },
        error: (err) => {
            console.log(err);
        }
    });
}