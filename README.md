** CRAWLER **

***
* data/ 存储需要访问的资源文件
 * topic.csv 关键字去重+分类去重
 * topic_bak.csv 标准资源文件
 * topic_bak_handle.csv 分类文件


* ddata/ 存储每日访问量数据


* hdata/ 存储每小时访问的数据


* history.js 执行后，获取2014-1-1 -> 2017-5-1每日访问数据


* day.js 每日访问量，自动累加到history查询的历史数据后面


* hour.js 按照查询时间，查询向前24小时数据


* topicHandle.js 关键字去重

***
* npm install


* DEBUG=nightmare node history
 * 获取2014-1-1到运行程序前一天的日数据，数据存储在ddata中，如果已经运行过，就不需要再运行了


* DEBUG=nightmare node day
 * 每日运行一次，获取前5日 日线数据 自动写入hdata中与历史数据组合成一套数据


* DEBUG=nightmare node hour
 * 获取每小时数据，每日运行一次，获取访问时间向前24小时数据，自动写入hdata
