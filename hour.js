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


var KEYWORDARRAY = [];                // 关键字数组
var KEYWORDLENGTH = 0;                // 关键字总数
var HOTWORDINDEX = 1;                 // 关键字指针
var HOTWORDPATH = 'hdata/';           // 每日数据存储根路径
var ERRORKEYWORD = [];                // 没有采集数据的关键字
var STARTTIME = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, ''); // 采集起始时间

var LOGPATH = '';    // 错误日志 记录哪些关键字没有被读取数据
var TOPICPATH = '';  // topic地址

var argv = process.argv[process.argv.length-1];
TOPICPATH = "data/topic_" + argv + ".csv";
LOGPATH = 'err_log/hour_err_' + argv + '.csv';

// ---------------- Tools ----------------
// 创建文件夹
var mkdir = function (dirname) {
  var realpath = HOTWORDPATH + dirname;
  if (!fs.existsSync(realpath)){
    fs.mkdirSync(realpath);
  }
  return realpath;
}

// 获取今天的日期 2017-05-06
var getToday = function () {
  var today = new Date();
  var dd = today.getDate();
  var mm = today.getMonth()+1; //January is 0!
  var yyyy = today.getFullYear();
  return yyyy + '-' + mm + '-' + dd;
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
      var d = getToday() + data.date[i];
      list.push(d, data.value[i]);
      formatData.push(list);
    }
    return formatData;
  } catch (e) {
    console.log('dataformat error & data is ::');
    console.log(data);
    return [];
  }

}

// ---------------- Start ----------------
// 获取关键字 形成关键字列表
csv
 .fromPath(TOPICPATH)
 .on("data", function(data){
   KEYWORDARRAY.push(data[0]);
 })
 .on("end", function(){
   KEYWORDLENGTH = KEYWORDARRAY.length;
   readHour(KEYWORDARRAY[HOTWORDINDEX]);
 });


var isComein = false;
var comein = function (callback) {
  nightmare
  .goto('http://data.weibo.com/index')
  .type('.filter_search1 input', '乐视网')
  .click('.filter_search1 a')
  .wait(3000)
  .click('.ss-nav')
  .wait(3000)
  .then(function (result) {
    callback(true)
  })
  .catch(function (error) {
    callback(false)
  });
}
var dataConector = function (keyword) {
  console.log(keyword);
  nightmare
  .type('.long-search input', "")
  .wait(300)
  .type('.long-search input', keyword)
  .click('.search-compare')
  .wait(2000)
  .evaluate(function () {
    // get visit title
    var title = document.getElementsByClassName("search-word")[0].innerHTML;
    // get hotword_chart echarts instance id
    var id = document.getElementById("realtime_24_chart").getAttribute("_echarts_instance_");
    // if (!id) return null;
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
    return ret;
  })
  .then(function (result) {
    console.log("\x1b[36m%s\x1b[0m", "提示: 卡住 执行then");
    if (result.title != keyword) {
      // console.log("\x1b[36m%s\x1b[0m", "提示: 标题和关键字不符 写入错误日志");
      ERRORKEYWORD.push(keyword);
      writeHourErrorHandle();
      return;
    }
    if (!result) {
      // console.log("\x1b[36m%s\x1b[0m", "提示: 获取小时数据不存在 写入错误日志");
      ERRORKEYWORD.push(keyword);
      writeHourErrorHandle();
      return;
    }
    // console.log("\x1b[36m%s\x1b[0m", "提示: 写入成功");
    var fdata = dataFormat(result);
    writeHour(result.title, fdata);
  })
  .catch(function (error) {
    console.log("\x1b[36m%s\x1b[0m", "提示: 卡住 执行error");
    ERRORKEYWORD.push(keyword);
    writeHourErrorHandle();
  });
}
var readHour = function(keyword){
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

/** 如果读取历史 读取错误 将错误的关键字 写入err_log中 文件名称 his_err.csv
 * [writeHisErrKeyword]
 * @param  keyword  "乐视网"
 */
var writeHisErrKeyword = function (keyword) {
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

var writeHour = function (fname, data) {
  var path = mkdir(fname);
  var fileName = path + "/data.csv";

  if (!fs.existsSync(fileName)) {
    fs.openSync(fileName, 'w');
  }

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
      if (fs.existsSync(fileName)) {
        console.log("\x1b[36m%s\x1b[0m", "提示: 文件已经正常写入");
        console.log(fname);
      }
      if (!fs.existsSync(fileName)) {
        console.log("\x1b[36m%s\x1b[0m", "提示: 写入数据出现错误, 正在重新写入...");
        console.log(fname);
        writeHour(fname, data);
        return;
      }
      if (HOTWORDINDEX < KEYWORDLENGTH - 1) {
        HOTWORDINDEX += 1;
        readHour(KEYWORDARRAY[HOTWORDINDEX]);
      }
      else {
        nightmare.halt();
        writeHisErrKeyword();
        console.log("\x1b[31m%s\x1b[0m", "READ OVER");
        console.log('start-time');
        console.log(STARTTIME);
        console.log('end-time');
        console.log(new Date().toISOString().replace(/T/, ' ').replace(/\..+/, ''));
      }
    });
  }
}

var writeHourErrorHandle = function (error) {
  if (HOTWORDINDEX < KEYWORDLENGTH - 1) {
    HOTWORDINDEX += 1;
    readHour(KEYWORDARRAY[HOTWORDINDEX]);
  }
  else {
    nightmare.halt();
    writeHisErrKeyword();
    console.log("\x1b[31m%s\x1b[0m", "READ OVER");
    console.log('start-time');
    console.log(STARTTIME);
    console.log('end-time');
    console.log(new Date().toISOString().replace(/T/, ' ').replace(/\..+/, ''));
  }
}
