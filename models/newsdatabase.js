const AWS = require('aws-sdk');
const req = require('express/lib/request.js');
const usr = require('./user.js');
const {v4 : uuidv4} = require('uuid');
const stemmer = require("stemmer");

AWS.config.update({
  region: 'us-east-1',
});

const db = new AWS.DynamoDB();

const runSpark = (user, callback) => {
    // using username as an input for run, execute the whole rankJob.class
	var exec = require('child_process').exec;
    var cmnd = 'mvn exec:java@ranker' + ' -Dexec.args=' + user.username;
    
    exec(cmnd,  { encoding: 'utf-8' },
      function (error, stdout, stderr) {
          console.log('stdout: ' + stdout);
          console.log('stderr: ' );
          if (error) {
              callback(error, null);
          } else {
            callback(null, "success");
          }
      });

}

const computeRank = (user, callback) => {
  let now = new Date();
  let today = now.getFullYear()+'-'+(now.getMonth()+1)+'-'+now.getDate();
  ret = [];
    db.query({
      ExpressionAttributeValues: {
        ':username': {S: user.username},
      },
      KeyConditionExpression: 'username = :username',
      TableName: 'newsRanked'
    }, (err, data) => {
      if (err) {
        callback(err, null);
      } else {
        db.query({
          ExpressionAttributeValues: {
            ':username': {S: user.username},
            ':viewdate' : {S: today.toString()},
          },
          KeyConditionExpression: 'username = :username and viewdate = :viewdate',
          TableName: 'newsViewed',
        }, (err, history) => {
          if (err) {
            callback(err, null);
          }
          if (history.Count > 0) {
            let firstAccess = new Date(history.Items[0].firstTime.S);
            let chint = parseInt(history.Items[0].changedInterest.N);
            const fetchNum = now.getHours() - firstAccess.getHours() + chint + 1;
            //console.log("num"+ fetchNum +""+ now.getHours()+ ""+firstAccess.getHours());
            let prev = JSON.parse(history.Items[0].viewed.S);
            for (let j = 0; j < fetchNum - prev.length; j++) {
              for (let i = 0; i < data.Items.length; i++) {
                if (!prev.includes(data.Items[i].headline.S) && !ret.includes(data.Items[i].headline.S)) {
                  ret.unshift(data.Items[i].headline.S);
                  break;
                }
              }
            }
            for (let i = 0; i < prev.length; i++) {
              ret.push(prev[i]);
            }
            callback(null, ret);
          } else {
            callback(null, [data.Items[0].headline.S]);
          }
        })
      }
    });
}

const fetchNewsDataByName = (headlines, callback) => {
  var result = [];
  var results = [];
  var promises = [];
  
  for (let i = 0; i < headlines.length; i++) {
   var params = {
    ExpressionAttributeValues: {
      ':headline': {S: headlines[i]},
    },
    KeyConditionExpression: 'headline = :headline',
    TableName: 'newsData'
  };
   
    let prom = db.query(params).promise(); // making array of promises
    promises.push(prom);
 }
  
  Promise.all(promises).then (
   data => {
     for (let i = 0; i < data.length; i++) {
       if (data[i].Count != 0) {
        result = data[i].Items[0]; 
        results.push(result);
       }
     }
     callback(null, results);
   },
   err => {
    callback(err, null);
   } 
 )
}

const addViewHistory = (user, articles, callback) => {  
  let now = new Date();
  let today = now.getFullYear()+'-'+(now.getMonth()+1)+'-'+now.getDate();
    db.query({
      ExpressionAttributeValues: {
        ':username': {S: user.username},
        ':viewdate' : {S: today.toString()},
      },
      KeyConditionExpression: 'username = :username and viewdate = :viewdate',
      TableName: 'newsViewed',
    }, (err, data) => {
      if (err) {
        callback(err, null);
      } else if (data.Items.length > 0) {
        let prev = JSON.parse(data.Items[0].viewed.S);
        for (let i = 0; i < articles.length; i++) {
          console.log(articles[i]);
          if (!prev.includes(articles[i])) {
            prev.unshift(articles[i]);
          }
          
        }
        let displayed = JSON.stringify(prev);
        console.log(displayed);
        params = {
          TableName: 'newsViewed',
                  Key: {
                      username: {
                          'S': user.username
                      },
                      viewdate : {
                          'S': today.toString()
                    }
                  },
                  UpdateExpression: "SET viewed = :viewed",
                  ExpressionAttributeValues: {
            ":viewed": {S: displayed},
          },
          ReturnValues: "UPDATED_NEW",
        };
        
        db.updateItem(params, function(err, data) {
          if (err) {
            callback(err, null);
          } else {
            callback(null, "updated"); // success!
          }
        });
      } else {
        let displayed = JSON.stringify(articles);
        db.putItem({
          TableName: 'newsViewed',
          Item: {
            username: {S: user.username},
            viewdate : {S: today.toString()},
            firstTime : {S: now.toString()},
            viewed : {S: displayed},
            changedInterest: {N: '0'},
          }
        },(err, data) => {
          if (err) {
            callback(err, null);
          } else {
            callback(null, "first");
          }
          });
      }
    });
}

const likeNews = (user, news, callback) => {
  db.putItem({
    TableName: 'likeNews',
    Item: {
      username: {S: user.username},
      headline : {S: news} 
    }
  },(err, data) => {
    if (err) {
      callback(err, null);
    } else {
      callback(null, "success");
    }
    });
}


const findNews = (user, keyword, callback) => {
  var iheadlines =[];
  var promises = [];

  for (let i = 0; i < arr.length; i++) {
    searchWord = keyword[i];
    console.log(searchWord);
    searchWord = searchWord.toLowerCase(); // change the search word into lowercase letter
      if (!(searchWord == ("a") || searchWord == ("all") || searchWord == ("any") 
            || searchWord == ("but") || searchWord == ("the"))) { //filter the words
          searchWord = stemmer(searchWord); //stem the word
        var params = {
        TableName : "tokenizedNews",
        Limit : 25,
        ExpressionAttributeValues: {
            ':k': {S: searchWord},
          },
        KeyConditionExpression : 'keyword = :k',
        };
        
        let prom = db.query(params).promise(); //create promise for each talk id
        promises.push(prom);
      }
    } 

    multiple = []
    Promise.all(promises).then(
      data => {
        if (data.length < 1) {
            callback("empty", null, null, null);
        }
        const today = new Date();
        let count = 0;

        for (let i = 0; i < data.length; i++) {
              data[i].Items.forEach(function(item){
              const newsDate = new Date(item.date.S);
              console.log
                if (newsDate <= today) { 
                  count = count + 1;
                  let tle = item.headline.S;
                  if (iheadlines.includes(tle)) {
                    if (multiple.includes(tle)) {
                      multiple.unshift(tle);
                    } else {
                      multiple.push(tle);
                    }
                  } else {
                    iheadlines.push(tle);
                  }
                }
            });
        }

        let overlap = iheadlines.length + multiple.length - count;
        multiple = multiple.slice(0, multiple.length - overlap);
        results = [];
        noRanks = [];
        promises2 = [];
        headlines = iheadlines.filter(value => !multiple.includes(value));

        for (let i = 0; i < headlines.length; i++) { 
          console.log(headlines[i]);
          var params = {
          ExpressionAttributeValues: {
            ':headline': {S: headlines[i]},
            ':username': {S: user.username},
          },
          KeyConditionExpression: 'headline = :headline and username = :username',
          IndexName :'headline-index',
          TableName: 'newsRanked'
        };

        let prom = db.query(params).promise();
        promises2.push(prom);
        }

        Promise.all(promises2).then(
          data => {
              for (let i = 0; i < data.length; i++) {
                if (data[i].Count > 0) {
                  data[i].Items.forEach(function(item){
                  let result = item.rank.N; // or Items?
                  results.push(result);
                });
                } else {
                  let result = headlines[i];
                  noRanks.push(result);
                }
              }

              results = results.sort((function(a,b){ return a - b})).slice(0,10);

              callback(null, multiple, noRanks, results)

          },
          err => {
            callback(err, null, null, null);	
          }  
        )
      }, 
      err => {
        callback(err, null, null, null);
      }
      );

}

const fetchTitleByRank = (user, ranks, callback) => {
  var result = [];
  var results = [];
  var promises = [];
  
  for (let i = 0; i < ranks.length; i++) {
    console.log(ranks[i]);
   var params = {
    ExpressionAttributeValues: {
      ':username': {S: user.username},
      ':rank': {N: ranks[i]},
    },
    ExpressionAttributeNames: {
      '#rank' : 'rank'
    },
    KeyConditionExpression: 'username = :username and #rank = :rank',
    TableName: 'newsRanked'
  };
   
    let prom = db.query(params).promise(); // making array of promises
    promises.push(prom);
 }
  
  Promise.all(promises).then (
   data => {
     for (let i = 0; i < data.length; i++) {
       if (data[i].length != 0) {
        result = data[i].Items[0]; 
        console.log(result);
        results.push(result);
       }
     }
     callback(null, results);
   },
   err => {
    callback(err, null);
   } 
 )
}

const changeInterest = (user, callback) => {  
  let now = new Date();
  let today = now.getFullYear()+'-'+(now.getMonth()+1)+'-'+now.getDate();
    db.query({
      ExpressionAttributeValues: {
        ':username': {S: user.username},
        ':viewdate' : {S: today.toString()},
      },
      KeyConditionExpression: 'username = :username and viewdate = :viewdate',
      TableName: 'newsViewed',
    }, (err, data) => {
      if (err) {
        callback(err, null);
      } else if (data.Items.length > 0) {
        let x = parseInt(data.Items[0].changedInterest.N);
        x = x+1;
        params = {
          TableName: 'newsViewed',
                  Key: {
                      username: {
                          'S': user.username
                      },
                      viewdate : {
                          'S': today.toString()
                    }
                  },
                  UpdateExpression: "SET changedInterest = :inc",
                  ExpressionAttributeValues: {
            ":inc": {N: x.toString()},
          },
          ReturnValues: "UPDATED_NEW",
        };
        
        db.updateItem(params, function(err, data) {
          if (err) {
            callback(err, null);
          } else {
            callback(null, "updated"); // success!
          }
        });
      } else {
        let x = 1;
        db.putItem({
          TableName: 'newsViewed',
          Item: {
            username: {S: user.username},
            viewdate : {S: today.toString()},
            firstTime : {S: now.toString()},
            viewed : {S: displayed},
            changedInterest: {N:x.toString()}
          }
        },(err, data) => {
          if (err) {
            callback(err, null);
          } else {
            callback(null, "first");
          }
          });
      }
    });
}

const database = {
    runSpark: runSpark,
    computeRank:  computeRank,
    fetchNewsDataByName: fetchNewsDataByName,
    addViewHistory: addViewHistory,
    likeNews: likeNews,
    findNews: findNews,
    fetchTitleByRank: fetchTitleByRank,
    changeInterest: changeInterest,
    
  }

  module.exports = database;