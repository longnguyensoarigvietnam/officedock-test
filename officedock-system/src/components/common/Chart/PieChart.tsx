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
  showTooltip = true,
}: PieChartProps) => {
  const defaultColors = [
    'rgba(255, 99, 132, 0.8)',
    'rgba(54, 162, 235, 0.8)',
    'rgba(255, 206, 86, 0.8)',
    'rgba(75, 192, 192, 0.8)',
  ];

  const filteredData = data.reduce<
    { value: number; label: string; color?: string; actualValue: string }[]
  >((acc, value, index) => {
    if (value > 0) {
      acc.push({
        value,
        label: labels[index],
        color: colors?.[index],
        actualValue: actualValues[index],
      });
    }
    return acc;
  }, []);

  const chartData: ChartData<'pie', number[], string> = {
    labels: filteredData.map((item) => item.label),
    datasets: [
      {
        data: filteredData.map((item) => item.value),
        backgroundColor: filteredData.map(
          (item) => item.color || defaultColors[0],
        ),
        borderColor: filteredData.map((item) =>
          (item.color || defaultColors[0]).replace('1', '1'),
        ),
        borderWidth: 1,
        hoverOffset: 0,
      },
    ],
  };

  const options: ChartOptions<'pie'> = {
    plugins: {
      legend: {
        display: showLegend,
      },
      tooltip: {
        enabled: showTooltip,

        callbacks: {
          title: () => '',
          label: (tooltipItem) => {
            const value = tooltipItem.raw as number;
            const actualValue = filteredData[tooltipItem.dataIndex].actualValue;

            const maxLabelLength = 15;
            let label = tooltipItem.label;
            if (label.length > maxLabelLength) {
              label = `${label.substring(0, maxLabelLength)}...`;
            }

            return [`${label} : ${value}%`, `${actualValue}`];
          },
        },
      },
      datalabels: {
        formatter: (value, context: Context) => {
          if (value < 20) return `${value}%`;

          const label = String(
            context.chart.data.labels?.[context.dataIndex] || '',
          );
          const maxLabelLength = 10;
          const truncatedLabel =
            label.length > maxLabelLength
              ? `${label.substring(0, maxLabelLength)}...`
              : label;

          return `${truncatedLabel}\n${value}%`;
        },
        color: '#fff',
        font: {
          weight: 'bold',
          size: 10,
        },
      },
    },
    hover: {
      mode: undefined,
    },
    interaction: {
      mode: undefined,
    },
  };

  return (
    <div className={`w-96 h-96 my-0 mx-auto ${className}`}>
      <Pie data={chartData} options={options} />
    </div>
  );
};

export default PieChart;
