// Dependent Package
var Nightmare = require('nightmare');
var csv = require('fast-csv');
var fs = require('fs');
var nightmare = Nightmare({'show': false});

console.log("\x1b[36m%s\x1b[0m", "▁ ▂ ▃ ▄ ▅ ▆ ▇ █ ▇ ▆ ▅ ▄ ▃ ▂ ▁");

var KEYWORDARRAY = [];         // 关键字数组
var KEYWORDLENGTH = 0;         // 关键字总数
var HOTWORDINDEX = 1;          // 热词历史关键字指针
var HOTWORDPATH = 'hdata/';    // 热词数据存储根路径

// ---------------- tools ----------------
// 创建文件夹
var mkdir = function (dirname) {
  var realpath = HOTWORDPATH + dirname;
  if (!fs.existsSync(realpath)){
    fs.mkdirSync(realpath);
  }
  return realpath;
}

var checkFileExist = function (path, cb) {
  if (!fs.existsSync(path)){
    var ws = fs.createWriteStream(path);
    csv
     .write([], {headers: ["date", "value"]})
     .pipe(ws);

   ws.on("finish", function(){
     cb()
   });
  }
  else {
    cb()
  }
}

/** 采集数据格式化
 * [dataFormat]
 date,value
 2017-04-05,246
 2017-04-06,663
 */
var dataFormat = function (data) {
  var formatData = [['date','value']];
  for (var i=0; i<data.date.length; i++) {
    var list = [];
    list.push(data.date[i], data.value[i]);
    formatData.push(list);
  }
  return formatData;
}

// 获取关键字 形成关键字列表
csv
 .fromPath("data/topic.csv")
 .on("data", function(data){
   KEYWORDARRAY.push(data[1]);
 })
 .on("end", function(){
   KEYWORDLENGTH = KEYWORDARRAY.length;
   readFiveDayHistory(KEYWORDARRAY[HOTWORDINDEX]);
 });

// ---------------- add history ----------------
var readFiveDayHistory = function (keyword) {
  console.log(keyword);
  nightmare
  .goto('http://data.weibo.com/index')
  .type('.filter_search1 input', keyword)
  .click('.filter_search1 a')
  .wait(2000)
  .evaluate(function () {
    // get visit title
    var title = document.getElementsByClassName("search-word")[0].innerHTML;
    // get hotword_chart echarts instance id
    var id = document.getElementById("hotword_chart").getAttribute("_echarts_instance_");
    // get x axis data
    var option = echarts.getInstanceById(id).getOption();
    var xData = option.xAxis[0].data;
    // get y axis data
    var series = echarts.getInstanceById(id).getSeries();
    var yData = series[0].data;
    // ret
    var ret = {
      "name"  : "热词趋势",
      "title" : title,
      "date"  : xData,
      "value" : yData
    };
    // return
    return ret;
  })
  .then(function (result) {
    var fdata = dataFormat(result);
    writeFiveDayHistory(result.title, fdata);
  })
  .catch(function (error) {
    writeFiveDayErrorHandle(error);
  });
}

var writeFiveDayHistory = function (fname, data) {
  var path = mkdir(fname);
  var fileName = path + "/data.csv";

  checkFileExist(fileName, function () {
    var stream = fs.createReadStream(fileName);

    var arr = []
    var csvStream = csv()
    .on("data", function(data){
      arr.push(data)
    })
    .on("end", function(){
      var rwData = addNewDate(arr);
      rewriteData(rwData);
    });

    stream.pipe(csvStream);
  })

  var addNewDate = function (list) {
    var index = 1;

    if (list.length != 0) {
      var lastItem = list[list.length-1];
      var lastItemDate = lastItem[0];for (var i in data) {
        if (data[i][0] == lastItemDate) {
          index = parseInt(i) + 1;
          break;
        }
      }
    }

    for (var j=index ; j<data.length ; j++ ) {
      list.push(data[j]);
    }
    return list;
  }

  var rewriteData = function (list) {
    var ws = fs.createWriteStream(fileName);
    csv
     .write(list, {headers: ['data', 'value']})
     .pipe(ws);

    ws.on("finish", function(){
      if (HOTWORDINDEX < KEYWORDLENGTH - 1) {
        HOTWORDINDEX += 1;
        readFiveDayHistory(KEYWORDARRAY[HOTWORDINDEX]);
      }
      else {
        nightmare.halt();
        console.log("\x1b[31m%s\x1b[0m", "READ OVER");
      }
    });
  }
}

var writeFiveDayErrorHandle = function (err) {
  if (HOTWORDINDEX < KEYWORDLENGTH - 1) {
    HOTWORDINDEX += 1;
    readFiveDayHistory(KEYWORDARRAY[HOTWORDINDEX]);
  }
  else {
    nightmare.halt();
    console.log("\x1b[31m%s\x1b[0m", "READ OVER");
  }
}
