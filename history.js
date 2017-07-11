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

var KEYWORDARRAY = [];               // 关键字数组
var KEYWORDLENGTH = 0;               // 关键字总数
var HOTWORDINDEX = 1;                // 热词历史关键字指针
var HOTWORDPATH = 'ddata/';          // 热词数据存储根路径
var ERRORKEYWORD = [];               // 没有采集数据的关键字

var STARTTIME = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');

var LOGPATH = '';    // 错误日志 记录哪些关键字没有被读取数据
var TOPICPATH = '';  // topic地址

var argv = process.argv[process.argv.length-1];
TOPICPATH = "data/topic_" + argv + ".csv";
LOGPATH = 'err_log/his_err_' + argv + '.csv';

// ---------------- tools ----------------
// 创建文件夹
var mkdir = function (dirname) {
  var realpath = HOTWORDPATH + dirname;
  if (!fs.existsSync(realpath)){
    fs.mkdirSync(realpath);
  }
  return realpath;
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
    console.log('dataformat error & data is ::');
    console.log(data);
    return [];
  }
}

// 获取运行程序当日
var getToday = function () {
  var today = new Date();
  var dd = today.getDate();
  var mm = today.getMonth()+1; //January is 0!

  var yyyy = today.getFullYear();
  return yyyy + '-' + mm + '-' + dd;
}

// 获取关键字 形成关键字列表
csv
 .fromPath(TOPICPATH)
 .on("data", function(data){
   KEYWORDARRAY.push(data[0]);
 })
 .on("end", function(){
   KEYWORDLENGTH = KEYWORDARRAY.length;
   readHotwordHistory(KEYWORDARRAY[HOTWORDINDEX]);
 });


// ---------------- history ----------------
/** 获取历史数据
 * [readHotwordHistory]
 */
var isComein = false;
var comein = function (callback) {
  var today = getToday();
  nightmare
  .goto('http://data.weibo.com/index')
  .type('.filter_search1 input', '乐视网')
  .click('.filter_search1 a')
  .wait(3000)
  .type('#datepicker', '2014-1-1')
  .type('#datepicker1', today)
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
      console.log("\x1b[36m%s\x1b[0m", "提示: 关键字不存在");
      ERRORKEYWORD.push(keyword);
      hotwordErrorHandle();
      return;
    }
    if (result.title.toLowerCase() != keyword.toLowerCase()) {
      console.log("\x1b[36m%s\x1b[0m", "提示: 关键字采集错误 正在重新采集");
      dataConector(keyword);
      return;
    }
    console.log("\x1b[36m%s\x1b[0m", "提示: 正常采集中...");
    var fdata = dataFormat(result);
    hotwordHistoryWrite(result.title, fdata);
  })
  .catch(function (error) {
    console.log("\x1b[36m%s\x1b[0m", "提示: 采集错误 错误关键字将写入错误日志");
    ERRORKEYWORD.push(keyword);
    hotwordErrorHandle();
  });
}
var readHotwordHistory = function(keyword){
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

/** 向文件夹中写历史数据
 * [hotwordHistoryWrite]
 * @param  fname 写文件的文件名称
 * @param  data  [ ['2016-1-1', '2016-1-1'], ['1000', '2000'] ]
 */
var hotwordHistoryWrite = function (fname, data) {
  var path = mkdir(fname);
  var fileName = path + "/data.csv";
  var ws = fs.createWriteStream(fileName);
  csv
   .write(data, {headers: ["date", "value"]})
   .pipe(ws);

  ws.on("error", function(){
    console.log("\x1b[36m%s\x1b[0m", "提示: 需要检查 ws.on('error')");
  })
  ws.on("finish", function(){
    // 数据写入后, 检查文件是否存在, 是否写入成功
    if (!fs.existsSync(fileName)) {
      console.log("\x1b[36m%s\x1b[0m", "提示: 写入数据出现错误, 正在重新写入...");
      hotwordHistoryWrite(fname, data);
      return;
    }
    console.log("\x1b[36m%s\x1b[0m", "提示: 数据写入成功");
    if (HOTWORDINDEX < KEYWORDLENGTH - 1) {
      HOTWORDINDEX += 1;
      readHotwordHistory(KEYWORDARRAY[HOTWORDINDEX]);
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

// 如果访问历史数据出错了就继续向下访问
var hotwordErrorHandle = function () {
  if (HOTWORDINDEX < KEYWORDLENGTH - 1) {
    HOTWORDINDEX += 1;
    readHotwordHistory(KEYWORDARRAY[HOTWORDINDEX]);
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
