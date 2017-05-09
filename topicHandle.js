// Dependent Package
var csv = require('fast-csv');
var fs = require('fs');

console.log("\x1b[36m%s\x1b[0m", "▁ ▂ ▃ ▄ ▅ ▆ ▇ █ ▇ ▆ ▅ ▄ ▃ ▂ ▁");

var topicHandle = function () {
  var fileName = "data/topic.csv";
  var stream = fs.createReadStream(fileName);
  var arr = [];
  var csvStream = csv()
  .on("data", function(data){
    arr.push(data)
  })
  .on("end", function(){
    var list = del(arr);
    rewriteData(list);
  });

  var del = function (l) {
    var list = [];
    for (var i in l) {
      list.push(l[i][0]);
    }
    uniqueNames = list.filter(function(item, pos) {
      return list.indexOf(item) == pos;
    })
    var rl = [];
    for (var i in uniqueNames) {
      var u = [uniqueNames[i]];
      rl.push(u)
    }
    return rl;
  }

  var rewriteData = function (list) {
    var ws = fs.createWriteStream(fileName);
    csv
     .write(list, {headers: ['data', 'value']})
     .pipe(ws);

    ws.on("finish", function(){
      console.log(' haha ');
    });
  }

  stream.pipe(csvStream);
}
// topicHandle()

var topicBakHandle = function () {
  var fileName = "data/topic_bak.csv";
  var stream = fs.createReadStream(fileName);
  var arr = [];
  var csvStream = csv()
  .on("data", function(data){
    arr.push(data)
  })
  .on("end", function(){
    var list = del(arr);
    rewriteData(list);
  });

  var del = function (l) {
    var list = [];
    for (var i in l) {
      list.push(l[i][2]);
    }
    uniqueNames = list.filter(function(item, pos) {
      return list.indexOf(item) == pos;
    })
    var rl = [];
    for (var i in uniqueNames) {
      var u = [uniqueNames[i]];
      rl.push(u)
    }
    return rl;
  }

  var rewriteData = function (list) {
    var ws = fs.createWriteStream('data/topic_bak_handle.cvs');
    csv
     .write(list, {headers: ['data', 'value']})
     .pipe(ws);

    ws.on("finish", function(){
      console.log(' haha ');
    });
  }

  stream.pipe(csvStream);
}
// topicBakHandle();
return;
