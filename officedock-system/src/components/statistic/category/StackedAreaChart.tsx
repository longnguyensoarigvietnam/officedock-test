'use client';
import React from 'react';
import Chart from 'react-apexcharts';
const StackedAreaChart = () => {
  const series = [
    { name: 'Product A', data: [40, 50, 45, 50, 55, 50, 45] },
    { name: 'Product B', data: [30, 35, 32, 38, 33, 36, 32] },
    { name: 'Product C', data: [30, 15, 23, 12, 12, 14, 23] },
  ];
  const annotations = series.map((s, seriesIndex) => {
    // Sum of heights of all previous series at index 0
    const previousTotal = series
      .slice(0, seriesIndex)
      .reduce((sum, prevSeries) => sum + prevSeries.data[0], 0);
    // Half of the current series height at index 0
    const currentHalf = s.data[0] / 2;
    // Midpoint for the first point (index 0)
    const averageMidpoint = previousTotal + currentHalf;
    return {
      y: averageMidpoint,
      label: {
        text: s.name,
        position: 'left',
        offsetX: 70,
        style: {
          color: 'white',
          background: 'transparent',
          fontWeight: 600,
          borderColor: 'transparent', // Remove border
          padding: 0,
        },
      },
      strokeDashArray: 0, // removes the dotted line
      borderColor: 'transparent',
    };
  });
  const options = {
    chart: {
      type: 'area',
      stacked: true,
      toolbar: {
        show: false,
      },
    },
    legend: {
      position: 'bottom',
      horizontalAlign: 'right',
      markers: {
        shape: 'square',
      },
      labels: {
        colors: '#77858F',
      },
    },
    dataLabels: {
      enabled: false,
      style: {
        colors: ['#333'],
        fontWeight: 'bold',
      },
      background: {
        enabled: false,
      },
      offsetX: 30,
      formatter: function ({seriesIndex, dataPointIndex}: { seriesIndex: any, dataPointIndex: any }) {
        const productNames = ['Product A', 'Product B', 'Product C'];
        if (dataPointIndex === 0) {
          return productNames[seriesIndex];
        }
        return '';
      },
      offsetY: 10,
    },
    colors: ['#2E9267', '#1772B6', '#D7576A'],
    fill: {
      type: 'solid',
      opacity: 1,
    },
    stroke: {
      curve: 'straight',
    },
    markers: {
      size: 0,
      hover: {
        size: 0,
      },
    },
    annotations: {
      yaxis: annotations,
    },
    yaxis: {
      opposite: true,
      labels: {
        formatter: (val: any) => `${val}%`,
      },
      max: 100,
    },
    xaxis: {
      categories: [
        'Day 1',
        'Day 2',
        'Day 3',
        'Day 4',
        'Day 5',
        'Day 6',
        'Day 7',
      ],
      tooltip: {
        enabled: false,
      },
      crosshairs: {
        show: true,
        width: 2,
        dashArray: 20,
        stroke: {
          color: '#fff',
          opacity: 1,
          zIndex: 5000,
        },
      },
    },
    tooltip: {
      enabled: true,
      intersect: false,
      shared: true,
      custom: function ({ series, dataPointIndex, w }: {series: any, dataPointIndex: any, w: any}) {
        const productNames = ['Product A', 'Product B', 'Product C'];
        return `
          <div style="background: white; border: 1px solid #ccc; padding: 8px; border-radius: 4px;">
            <strong>${w.globals.labels[dataPointIndex]}</strong><br/>
            ${series
              .map((value: any, index: any) => {
                const color = w.globals.colors[index];
                return `<div style="display: flex; align-items: center; gap: 5px;">
                        <div style="width: 12px; height: 12px; background: ${color};"></div>
                        <span>${productNames[index]}:</span>
                        <strong>${value[dataPointIndex]}%</strong>
                      </div>`;
              })
              .join('')}
          </div>
        `;
      },
    },
  };
  return <Chart options={options as any} series={series} type="area" height={350} />;
};
export default StackedAreaChart;