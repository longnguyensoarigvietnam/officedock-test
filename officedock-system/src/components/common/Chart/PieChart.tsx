import { Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  ChartData,
  ChartOptions,
} from 'chart.js';
import ChartDataLabels, { Context } from 'chartjs-plugin-datalabels';

ChartJS.register(ArcElement, Tooltip, Legend, ChartDataLabels);

interface PieChartProps {
  data: number[];
  labels: string[];
  colors?: string[];
  actualValues: string[];
  className?: string;
  showLegend?: boolean;
  showTooltip?: boolean;
}

const PieChart = ({
  data,
  labels,
  colors,
  className,
  actualValues,
  showLegend = false,
}: PieChartProps) => {
  const defaultColors = [
    'rgba(255, 99, 132, 0.8)',
    'rgba(54, 162, 235, 0.8)',
    'rgba(255, 206, 86, 0.8)',
    'rgba(75, 192, 192, 0.8)',
  ];
  const chartData: ChartData<'pie', number[], string> = {
    labels,
    datasets: [
      {
        data,
        backgroundColor: colors || defaultColors,
        borderColor:
          colors?.map((color) => color.replace('1', '1')) ||
          defaultColors.map((color) => color.replace('1', '1')),
        borderWidth: 1,
      },
    ],
  };

  const options: ChartOptions<'pie'> = {
    plugins: {
      legend: {
        display: showLegend,
      },
      tooltip: {
        enabled: false,
        external: (context) => {
          let tooltipEl = document.getElementById('chartjs-tooltip');
          if (!tooltipEl) {
            tooltipEl = document.createElement('div');
            tooltipEl.id = 'chartjs-tooltip';
            tooltipEl.style.position = 'absolute';
            tooltipEl.style.zIndex = '99';
            tooltipEl.style.background = 'white';
            tooltipEl.style.width = '167px';
            tooltipEl.style.color = 'black';
            tooltipEl.style.fontSize = '14px';
            tooltipEl.style.fontWeight = '500';
            tooltipEl.style.padding = '20px';
            tooltipEl.style.borderRadius = '6px';
            tooltipEl.style.pointerEvents = 'none';
            tooltipEl.style.transform = 'translate(-50%, 0)';
            tooltipEl.style.boxShadow = '0px 2px 8px 0px #0000001A';
            document.body.appendChild(tooltipEl);
          }
          const { tooltip } = context;
          if (!tooltip || tooltip.opacity === 0) {
            tooltipEl.style.opacity = '0';
            return;
          }

          if (tooltip.body) {
            const title = tooltip.title || [];
            const body = tooltip.body.map((b) => b.lines).flat();
            const color = tooltip.labelColors[0]?.backgroundColor || '#000';
            const dataIndex = tooltip.dataPoints[0]?.dataIndex; // Index of current point
            const actualValue = actualValues[dataIndex]; // Access actualValues

            let innerHtml = `
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 5px; z-index: 9999;">
              <div style="width: 12px; height: 12px; background: ${color}; border-radius: 2px;"></div>
              <span style="font-weight: bold;font-weight: bold; max-width: 105px; line-break: anywhere;">${title.join('<br>')}</span>
            </div>
          `;
            body.forEach((line) => {
              innerHtml += `<div style="display: flex; gap: 8px; font-size: 16px; font-weight: 400">
              <span>${line}% </span>
              <span>  ${actualValue} </span>
               </div>`;
            });

            tooltipEl.innerHTML = innerHtml;
          }

          const canvas = context.chart.canvas;
          const position = canvas.getBoundingClientRect();

          tooltipEl.style.opacity = '1';
          tooltipEl.style.left =
            position.left + 120 + window.pageXOffset + tooltip.caretX + 'px';
          tooltipEl.style.top =
            position.top - 50 + window.pageYOffset + tooltip.caretY + 'px';
        },
      },
      datalabels: {
        formatter: (value, context: Context) => {
          const maxLength = 20;
          const label = context.chart.data.labels?.[context.dataIndex];

          if (typeof label === 'string') {
            const truncatedLabel =
              label.length > maxLength
                ? `${label.substring(0, maxLength)}...`
                : label;

            return `${truncatedLabel}\n${value}%`;
          }

          return `${value}%`;
        },
        color: '#fff',
        font: {
          weight: 'bold',
          size: 14,
        },
        align: 'center',
        anchor: 'center',
        textAlign: 'center',
      },
    },
  };

  return (
    <div className={`w-96 h-96 my-0 mx-auto ${className}`}>
      <Pie data={chartData} options={options} />
    </div>
  );
};

export default PieChart;
