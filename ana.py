# -*- coding: utf-8 -*-

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import math
import csv
from Naked.toolshed.shell import execute_js

#### 分类
CATALOG_PATH = "originalData/topic_all.csv";

#### METHOD
# 5日均线
def get5AverageDayLine (dataframe) :
  return dataframe.rolling(window=5).mean();
# 15日均线
def get15AverageDayLine (dataframe) :
  return dataframe.rolling(window=15).mean();
# 30日均线
def get30AverageDayLine (dataframe) :
  return dataframe.rolling(window=30).mean();
# 绘制曲线
def drawAverageLine (rm) :
  rm.cumsum();
  rm.plot(x='date', y='value');
  plt.show();
# csv转化成dataframe
def getDataFrameFromCSV (path) :
  return pd.read_csv(path, sep='\s*,\s*', header=0, encoding='utf-8', engine='python')
# 求30日均线和最后一天比较
def volatility (dataframe) :
  value30 = dataframe.tail(30);
  mean = value30["value"].mean();
  return dataframe.tail(1).iloc[0]["value"] / mean;

# 对所有处理过的数据排序
rDataframe = pd.DataFrame(columns=('name', 'value'));
def resultSort (name, val) :
  global rDataframe;
  rDataframe.loc[-1] = [name, val];
  rDataframe.index = rDataframe.index + 1;
  rDataframe = rDataframe.sort(columns='value');

def strictly_increasing(L):
    return all(x<y for x, y in zip(L, L[1:]))

def getIncreasingDataframe(name, dataframe):
  tail3 = dataframe.tail(3);
  tail3_arr = tail5['value'].values;

  isIncrease = strictly_increasing(tail3_arr);
  if isIncrease:
    print(name);
    print(tail3_arr);

fluctuationDataframe = pd.DataFrame(columns=('name', 'fluc'));
def getSlightFluctuation(name, dataframe, min, max):
  global fluctuationDataframe;
  aver5 = dataframe.tail(5)["value"].mean();
  aver30 = dataframe.tail(30)["value"].mean();
  fluctuation = float(aver5) / float(aver30);
  if min <= fluctuation <= max:
    fluctuationDataframe.loc[-1] = [name, fluctuation];
    fluctuationDataframe.index = fluctuationDataframe.index + 1;
    fluctuationDataframe = fluctuationDataframe.sort(columns='fluc');

# 获取采集列表
itemArr = getDataFrameFromCSV(CATALOG_PATH);
for index, row in itemArr.iterrows():
  path = 'ddata/' + row['data'] + '/data.csv';
  try:
    df = getDataFrameFromCSV(path);
    # 捕获5天连续增长
    # getIncreasingDataframe(row['data'], df);
    # 求增长最快列表
    # val = volatility(df);
    # resultSort(row['data'], val);
    # 获取小幅波动的数据 波动范围
    getSlightFluctuation(row['data'], df, 1.1, 1.2);
  except IOError:
    continue;

# print(rDataframe);
print(fluctuationDataframe);
