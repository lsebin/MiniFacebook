let posts = [];

$(document).ready(() => {
    refreshFeed();
});

function searchUser() {
    let query = $('#wall-searchuser-input').val();
    window.location.href = `/searchuser?term=${query}`;
}

function refreshFeed() {
    $.ajax({
        url: '/ajaxviewfeed',
        type: 'POST',
        datatype: 'json',
        success: (response) => {
            console.log(response);
            let postTarget = $('#wall-post-target');
            let queriedPosts = response;
            
            let addPosts = newPosts(queriedPosts);

            let postNone = document.createElement('p');
            postNone.innerText = 'No posts';
            
            if (posts.length < 1) {
                postTarget.append(postNone);
            } else {
                addPosts.forEach(d => {
                    let postContent = document.createElement('div');
                    postContent.className = "wall-postcontent";

                    let poster = document.createElement('a');
                    poster.href = `/mywall/${d.userwall}`
                    let posterInside = document.createElement('h1');
                    posterInside.innerText = `${d.poster} > ${d.userwall}'s wall`;
                    posterInside.className = "wall-postposter";
                    poster.appendChild(posterInside);
                    
                    let text = document.createElement('p');
                    text.innerText = d.text;
                    text.className = "wall-posttext";

                    let time = document.createElement('p');
                    time.innerText = d.timestamp;
                    time.className = "wall-posttime";

                    let commentArr = d.comments && d.comments.length > 0
                        ? JSON.parse(d.comments) : [];
                    
                    let commentSection = document.createElement('div');
                    let commentHeader = document.createElement('h3');
                    commentHeader.innerHTML = "Comments"
                    commentSection.appendChild(commentHeader);

                    commentSection.className = 'wall-commentsection'
                    commentArr.forEach(c => {
                        let comment = document.createElement('div');
                        comment.className = 'wall-comment';

                        let commenter = document.createElement('h3');
                        commenter.className = 'wall-commenter';

                        commenter.innerText = c.commenter;

                        let commentText = document.createElement('p');
                        commentText.className = 'wall-commentText';

                        commentText.innerText = c.text;

                        comment.appendChild(commenter);
                        comment.appendChild(commentText);

                        commentSection.appendChild(comment);
                    });

                    let commentTextInput = document.createElement('textarea');
                    commentTextInput.id = 'wall-comment-input-' + d.postuuid;
                    let commentSubmit = document.createElement('button');
                    commentSubmit.innerText = 'Post Comment';
                    commentSubmit.onclick = () => {
                        postComment(d.userwall, d.postuuid, commentTextInput.value);
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
        error: (err) => {
            console.log(err);
        }
    })
}

function postComment(userwall, postuuid, text) {
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