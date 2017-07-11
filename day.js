// Dependent Package
var Nightmare = require('nightmare');
var csv = require('fast-csv');
var fs = require('fs');
var nightmare = Nightmare({
  'show': false,
  'executionTimeout': 1000,
  'dock': true
});

console.log("\x1b[36m%s\x1b[0m", "▁ ▂ ▃ ▄ ▅ ▆ ▇ █ ▇ ▆ ▅ ▄ ▃ ▂ ▁");

var KEYWORDARRAY = [];         // 关键字数组
var KEYWORDLENGTH = 0;         // 关键字总数
var HOTWORDINDEX = 1;          // 热词历史关键字指针
var HOTWORDPATH = 'ddata/';    // 热词数据存储根路径
var ERRORKEYWORD = [];               // 没有采集数据的关键字

var STARTTIME = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');

var LOGPATH = '';    // 错误日志 记录哪些关键字没有被读取数据
var TOPICPATH = '';  // topic地址

var argv = process.argv[process.argv.length-1];
TOPICPATH = "data/topic_" + argv + ".csv";
LOGPATH = 'err_log/day_err_' + argv + '.csv';

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
  try {
    if (!fs.existsSync(path)){
      console.log("\x1b[36m%s\x1b[0m", "提示: 文件不存在");
      var ws = fs.createWriteStream(path);
      csv
       .write([], {headers: ["date", "value"]})
       .pipe(ws);

      ws.on("finish", function(e){
        console.log("\x1b[36m%s\x1b[0m", "提示: 文件创建完成");
        checkFileExist(path, cb);
      });
    }
    else {
      console.log("\x1b[36m%s\x1b[0m", "提示: 文件已经存在");
      console.log(path);
      cb();
    }
  } catch (e) {
    console.log('ccc');
    console.log(e);
  }
}

/** 采集数据格式化
 * [dataFormat]
 date,value
 2017-04-05,246
 2017-04-06,663
 */
var dataFormat = function (data) {
  try {
    var formatData = [['date','value']];
    for (var i=0; i<data.date.length; i++) {
      var list = [];
      list.push(data.date[i], data.value[i]);
      formatData.push(list);
    }
    return formatData;
  } catch (e) {
    console.log("\x1b[36m%s\x1b[0m", "提示: 格式化数据错误");
    console.log(data);
    return [];
  }
}

// 获取关键字 形成关键字列表
csv
 .fromPath(TOPICPATH)
 .on("data", function(data){
   KEYWORDARRAY.push(data[0]);
 })
 .on("end", function(){
   KEYWORDLENGTH = KEYWORDARRAY.length;
   readFiveDayHistory(KEYWORDARRAY[HOTWORDINDEX]);
 });

var isComein = false;
var comein = function (callback) {
  nightmare
  .goto('http://data.weibo.com/index')
  .type('.filter_search1 input', '乐视网')
  .click('.filter_search1 a')
  .wait(3000)
  .then(function (result) {
    callback(true)
  })
  .catch(function (error) {
    callback(false)
  });
}
var dataConector = function (keyword) {
  console.log("\x1b[36m%s\x1b[0m", keyword);
  nightmare
  .type('.long-search input', "")
  .wait(300)
  .type('.long-search input', keyword)
  .click('.search-compare')
  .wait(1000)
  .evaluate(function () {
    var inputKeyword = document.querySelector(".long-search input").value;
    if (inputKeyword == "找不到此热词") {return false;}
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
    if (!result) {
      ERRORKEYWORD.push(keyword);
      writeFiveDayErrorHandle();
      return;
    }
    if (result.title.toLowerCase() != keyword.toLowerCase()) {
      console.log("\x1b[36m%s\x1b[0m", "提示: 采集Title不等于Keyword 重新采集");
      dataConector(keyword);
      return;
    }
    var fdata = dataFormat(result);
    writeFiveDayHistory(result.title, fdata);
  })
  .catch(function (error) {
    console.log("\x1b[36m%s\x1b[0m", "提示: 采集错误 需要将keyword写入错误文件");
    ERRORKEYWORD.push(keyword);
    writeFiveDayErrorHandle();
  });
}
var readFiveDayHistory = function(keyword){
  if (!isComein) {
    comein(function(isci){
      if (!isci) {
        console.log(' SYSTEM START ERROR !!! ');
        nightmare.halt();
        return;
      }
      isComein = isci;
      dataConector(keyword);
    })
  }
  else {
    dataConector(keyword);
  }

}

/** 如果读取历史 读取错误 将错误的关键字 写入err_log中 文件名称 day_err.csv
 * [writeHisErrKeyword]
 * @param  keyword  "乐视网"
 */
var writeDayErrKeyword = function () {
  console.log(ERRORKEYWORD);
  var val = [["value"]];
  for (var i in ERRORKEYWORD) {
    var arr = [];
    arr.push(ERRORKEYWORD[i]);
    val.push(arr);
  }
  var ws = fs.createWriteStream(LOGPATH);
  csv
   .write(val, {headers: ["value"]})
   .pipe(ws);
}

var writeFiveDayHistory = function (fname, data) {
  var path = mkdir(fname);
  var fileName = path + "/data.csv";

  var write = function (data) {
    checkFileExist(fileName, function () {
      var stream = fs.createReadStream(fileName);
      try {
        var arr = [];
        var csvStream = csv()
        .on("data", function(data){
          arr.push(data)
        })
        .on("error", function(data){
          console.log("\x1b[36m%s\x1b[0m", "------");
          write(data);
        })
        .on("end", function(){
          var rwData = addNewDate(arr);
          rewriteData(rwData);
        });
        stream.pipe(csvStream);
      } catch (e) {
        console.log(e);
        write(data);
      }
    })
  }

  var addNewDate = function (list) {
    var index = 1;

    if (list.length != 0) {
      var lastItem = list[list.length-1];
      var lastItemDate = lastItem[0];
      for (var i in data) {
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
      if (!fs.existsSync(fileName)) {
        console.log("\x1b[36m%s\x1b[0m", "提示: 写入数据出现错误, 正在重新写入...");
        console.log(fname);
        writeHour(fname, data);
        return;
      }
      if (HOTWORDINDEX < KEYWORDLENGTH - 1) {
        HOTWORDINDEX += 1;
        readFiveDayHistory(KEYWORDARRAY[HOTWORDINDEX]);
      }
      else {
        nightmare.halt();
        writeDayErrKeyword();
        console.log("\x1b[31m%s\x1b[0m", "READ OVER");
        console.log('start-time');
        console.log(STARTTIME);
        console.log('end-time');
        console.log(new Date().toISOString().replace(/T/, ' ').replace(/\..+/, ''));
      }
    });
  }

  write(data);

}

var writeFiveDayErrorHandle = function () {
  if (HOTWORDINDEX < KEYWORDLENGTH - 1) {
    HOTWORDINDEX += 1;
    readFiveDayHistory(KEYWORDARRAY[HOTWORDINDEX]);
  }
  else {
    nightmare.halt();
    writeDayErrKeyword();
    console.log("\x1b[31m%s\x1b[0m", "READ OVER");
    console.log('start-time');
    console.log(STARTTIME);
    console.log('end-time');
    console.log(new Date().toISOString().replace(/T/, ' ').replace(/\..+/, ''));
  }
}
