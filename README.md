# MiniFacebook(Matcha)



Our social media platform called MatchA is a forum and messaging website with posting, newsfeed, group direct messaging, and friend network visualizer. We borrowed some core features of Facebook and added our own features to recreate it. 


1. Login/Sign up
  * AJAX
  * Secure login using bcrypt encryption
2. Chats
  * DynamoDB for storing chatroom, user data, and chat messages
  * Socket.io
3. Friends network visualizer
  * AJAX 
  * DynamoDB for JSON querying
4. Newsfeed
  * Adsorption algorithm implemented using ApacheSpark
  * DynomoDB for news database
5. Posts/Feeds
