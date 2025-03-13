import React from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

// Đăng ký các thành phần cần thiết cho biểu đồ
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
);

const data = {
  labels: ['12月8日', '12月15日', '12月22日', '12月29日', '12月6日'],
  datasets: [
    {
      label: '大カテゴリA',
      data: [15, 13, 11, 9, 6],
      borderColor: '#D9534F',
      backgroundColor: 'rgba(217, 83, 79, 0.2)', // Màu nền mờ
      fill: true,
      tension: 0.3,
    },
    {
      label: '大カテゴリB',
      data: [10, 9, 8, 6.5, 5],
      borderColor: '#337AB7',
      backgroundColor: 'rgba(51, 122, 183, 0.2)',
      fill: true,
      tension: 0.3,
    },
    {
      label: '大カテゴリC',
      data: [5, 4.5, 4, 3.5, 3],
      borderColor: '#5CB85C',
      backgroundColor: 'rgba(92, 184, 92, 0.2)',
      fill: true,
      tension: 0.3,
    },
  ],
};

const options = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom' as const,
      labels: {
        generateLabels: (chart) => {
          try {
            if (!chart || !chart.data || !chart.data.datasets) return [];

            return chart.data.datasets.map((dataset, index) => ({
              text: `${dataset.label} \n category lớn ${String.fromCharCode(65 + index)}`,
              fillStyle: dataset.borderColor,
              strokeStyle: dataset.borderColor,
              lineWidth: 2,
            }));
          } catch (error) {
            console.error('Lỗi khi generateLabels:', error);
            return [];
          }
        },
      },
      onClick: (e, legendItem, legend) => {
        const chart = legend.chart;
        console.log('ccheck', chart);

        if (!chart) return; // Tránh lỗi nếu chart bị null

        const index = legendItem.datasetIndex;
        if (index === undefined) return;

        // Đảo trạng thái hidden của dataset
        chart.getDatasetMeta(index).hidden =
          !chart.getDatasetMeta(index).hidden;
        chart.update(); // Cập nhật biểu đồ
      },
    },
    tooltip: {
      callbacks: {
        label: (tooltipItem: any) => `${tooltipItem.raw} 時間`,
      },
    },
    datalabels: {
      display: false,
    },
  },
  elements: {
    point: {
      radius: 0,
      hoverRadius: 5,
    },
  },
  scales: {
    x: {},
    y: {
      position: 'right',
      ticks: { stepSize: 5 },
    },
  },
};

const TimeChart: React.FC = () => {
  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <h2 className="text-lg font-bold mb-2">合計時間 65時間00分</h2>
      <div className="w-full h-80">
        <Line data={data} options={options} />
      </div>
    </div>
  );
};

export default TimeChart;
