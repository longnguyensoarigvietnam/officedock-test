'use client';
'use client';
import React from 'react';
import ReactECharts from 'echarts-for-react';

const LineChart = () => {
  const avatars = {
    '安藤 優希': 'https://yourdomain.com/avatar1.png',
    '亀山 太郎': 'https://yourdomain.com/avatar2.png',
    '佐藤 朋子': 'https://yourdomain.com/avatar3.png',
    '田中 幸也': 'https://yourdomain.com/avatar4.png',
  };

  const option = {
    tooltip: {
      trigger: 'axis',
    },
    legend: {
      bottom: 0,
      icon: 'rect',
      textStyle: {
        fontSize: 12,
        color: '#666',
      },
    },
    grid: {
      left: '10%',
      right: '10%',
      bottom: '15%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: ['12月8日', '15日', '22日', '29日'],
      axisTick: { alignWithLabel: true },
      splitLine: { show: false },
    },
    yAxis: {
      type: 'value',
      splitLine: { show: false },
      axisLine: { show: true, lineStyle: { color: '#333' } },
    },
    series: Object.entries(avatars).map(([name, url]) => ({
      name,
      type: 'line',
      data: [
        Math.random() * 20,
        Math.random() * 30,
        Math.random() * 25,
        Math.random() * 15,
      ],
      lineStyle: { type: 'solid' },
      symbol: `image://${url}`, // Hiển thị avatar ở mỗi điểm
      symbolSize: 20,
      markPoint: {
        data: [
          {
            coord: ['12月8日', Math.random() * 20], // Hiển thị avatar ở điểm đầu tiên
            symbol: `image://${url}`,
            symbolSize: 28,
          },
        ],
      },
    })),
  };

  return (
    <ReactECharts option={option} style={{ height: '400px', width: '100%' }} />
  );
};

export default LineChart;
