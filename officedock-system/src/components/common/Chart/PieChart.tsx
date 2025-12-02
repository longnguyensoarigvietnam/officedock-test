'use client';
import { Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  ChartData,
  ChartOptions,
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { useEffect } from 'react';

ChartJS.register(ArcElement, Tooltip, Legend, ChartDataLabels);
ChartJS.defaults.font.family = 'Noto Sans JP, sans-serif';

const TwoLineLabelPlugin = {
  id: 'twoLineLabelPlugin',
  afterDatasetsDraw(chart: any) {
    const { ctx } = chart;

    const meta = chart.getDatasetMeta(0);
    if (!meta || !meta.data) return;

    const labels = chart.data?.labels || [];
    const dataset = chart.data?.datasets?.[0];
    if (!dataset || !dataset.data) return;

    const values = dataset.data as number[];

    ctx.save();

    meta.data.forEach((arc: any, index: number) => {
      const value = values[index];
      if (!value && value !== 0) return;

      const rawLabel = labels?.[index] || '';
      const maxLength = 10;
      const label =
        rawLabel.length > maxLength
          ? rawLabel.substring(0, maxLength) + '...'
          : rawLabel;

      if (!arc || !arc.tooltipPosition) return;
      const pos = arc.tooltipPosition();
      if (!pos) return;

      const x = pos.x;
      const y = pos.y;

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#fff';

      // ✦ 1) ONLY SHOW LABEL IF value >= 20
      if (value >= 20) {
        ctx.font = '500 14px "Noto Sans JP", sans-serif';
        ctx.fillText(label, x, y - 16);
      }

      // ✦ 2) Value 24px
      ctx.font = '400 24px "Noto Sans JP", sans-serif';
      const valueText = `${value}`;
      const valueWidth = ctx.measureText(valueText).width;

      // ✦ 3) Percent symbol % (14px)
      ctx.font = '14px "Noto Sans JP", sans-serif';
      const percentWidth = ctx.measureText('%').width;

      const totalWidth = valueWidth + percentWidth;
      const startX = x - totalWidth / 2;

      // Value (big)
      ctx.font = '400 24px "Noto Sans JP", sans-serif';
      ctx.fillText(valueText, startX + valueWidth / 2, y + 8);

      // Percent symbol (small)
      ctx.font = '14px "Noto Sans JP", sans-serif';
      ctx.fillText('%', startX + valueWidth + percentWidth / 2, y + 10);
    });

    ctx.restore();
  },
};

interface PieChartProps {
  id?: string;
  data: number[];
  labels: string[];
  colors?: string[];
  actualValues: string[];
  className?: string;
  showLegend?: boolean;
  showTooltip?: boolean;
  colorLabel?: string;
}

const PieChart = ({
  id,
  data,
  labels,
  colors,
  className,
  colorLabel = '#fff',
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
        backgroundColor: colors?.length
          ? filteredData.map((item, i) => colors[i])
          : defaultColors.slice(0, filteredData.length),
        borderColor: colorLabel !== 'fff' ? colorLabel : '#fff',
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
        enabled: false,
        external: (context) => {
          const tooltipModel = context.tooltip;
          let tooltipEl = document.getElementById('custom-tooltip');
          if (!showTooltip) {
            if (tooltipEl) {
              tooltipEl.style.opacity = '0';
            }
            return;
          }

          if (!tooltipEl) {
            tooltipEl = document.createElement('div');
            tooltipEl.id = 'custom-tooltip';
            tooltipEl.style.position = 'absolute';
            tooltipEl.style.zIndex = '99';

            tooltipEl.style.pointerEvents = 'none';
            tooltipEl.style.transition = 'all .1s ease';
            document.body.appendChild(tooltipEl);
          }

          if (tooltipModel.opacity === 0) {
            tooltipEl.style.opacity = '0';
            return;
          }

          const index = tooltipModel.dataPoints[0].dataIndex;
          const datasetIndex = tooltipModel.dataPoints[0].datasetIndex;
          const dataset = context.chart.data.datasets[datasetIndex];
          const bgColor = Array.isArray(dataset.backgroundColor)
            ? (dataset.backgroundColor[index] as string)
            : (dataset.backgroundColor as string);
          const item = filteredData[index];

          tooltipEl.innerHTML = `
            <div style="
              background:white;
              padding:20px;
              border-radius:8px;
              box-shadow:0 2px 8px rgba(0,0,0,0.15);
              font-family: sans-serif;
              width : '167px'
              zIndex : '99999'
            ">
              <div style="display:flex;align-items:center;gap:6px;margin-bottom:12px;">
                <div style="width:12px;height:12px;border-radius:50%;background:${bgColor};"></div>
             <strong style="
        font-size:16px;
        display:-webkit-box;
        -webkit-line-clamp:2;
        -webkit-box-orient:vertical;
        overflow:hidden;
        text-overflow:ellipsis;
        line-height:1.3em;
        max-height:2.6em;
        word-break:break-word;
      ">${item.label}</strong>
              </div>
              <div style="font-size:16px;display:flex;gap:10px;">
                <span>${item.value}%</span>
                <span>${item.actualValue}</span>
              </div>
            </div>
          `;

          const { offsetLeft, offsetTop } = context.chart.canvas;
          tooltipEl.style.opacity = '1';
          tooltipEl.style.left = offsetLeft + tooltipModel.caretX + 'px';
          tooltipEl.style.top = offsetTop + tooltipModel.caretY + 'px';
        },
      },
      datalabels: {
        display: false,
      },
    },
    hover: {
      mode: undefined,
    },
    interaction: {
      mode: undefined,
    },
  };

  useEffect(() => {
    return () => {
      const tooltipEl = document.getElementById('custom-tooltip');
      if (tooltipEl) {
        tooltipEl.style.opacity = '0';
        tooltipEl.remove();
      }
    };
  }, []);

  return (
    <div id={id} className={`w-96 h-96 my-0 mx-auto ${className}`}>
      <Pie data={chartData} options={options} plugins={[TwoLineLabelPlugin]} />
    </div>
  );
};

export default PieChart;
