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
import ChartDataLabels, { Context } from 'chartjs-plugin-datalabels';
import { useEffect, useRef } from 'react';
import { OptionDropdownType } from '@interfaces/common';
import { getRandomColor } from '@utils';

ChartJS.register(ArcElement, Tooltip, Legend, ChartDataLabels);

interface PieChartProps {
  isTeam?: boolean;
  data: number[];
  isClickTooltip?: boolean;
  labels: string[];
  colors?: string[];
  actualValues: string[];
  className?: string;
  showLegend?: boolean;
  showTooltip?: boolean;
  optionsData?: {
    label: string;
    percent?: number;
  }[][];
  listIdData?: number[];
  handleClickTooltip?: (id: number | null) => void;
  handleClickChart?: (data: OptionDropdownType) => void;
}

const PieChart = ({
  data,
  labels,
  colors,
  className,
  actualValues,
  isClickTooltip = false,
  showLegend = false,
  isTeam = false,
  optionsData,
  listIdData,
  handleClickChart,
  handleClickTooltip,
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
            tooltipEl.style.zIndex = '5';
            tooltipEl.style.background = 'white';
            tooltipEl.style.width = isClickTooltip ? '250px' : '167px';
            tooltipEl.style.color = 'black';
            tooltipEl.style.fontSize = isClickTooltip ? '16px' : '14px';
            tooltipEl.style.fontWeight = '500';
            tooltipEl.style.padding = '20px';
            tooltipEl.style.borderRadius = '6px';
            tooltipEl.style.pointerEvents = isClickTooltip ? 'auto' : 'none';
            tooltipEl.style.transform = 'translate(-50%, 0)';
            tooltipEl.style.boxShadow = '0px 2px 8px 0px #0000001A';
            tooltipEl.style.transition = 'opacity 0.1s ease';
            tooltipEl.style.opacity = '0';
            tooltipEl.addEventListener('mouseenter', () => {
              if (tooltipEl) {
                tooltipEl.style.opacity = '1';
                tooltipEl.dataset.hovering = 'true';
              }
            });
            tooltipEl.addEventListener('mouseleave', () => {
              if (tooltipEl) {
                tooltipEl.style.opacity = '0';
                tooltipEl.dataset.hovering = 'false';
              }
            });

            document.body.appendChild(tooltipEl);
          }

          const { tooltip } = context;

          if (!tooltip || tooltip.opacity === 0) {
            if (tooltipEl.dataset.hovering !== 'true') {
              tooltipEl.style.opacity = '0';
            }
            return;
          }

          if (tooltip.body) {
            const title = tooltip.title || [];
            const body = tooltip.body.map((b) => b.lines).flat();
            const color = tooltip.labelColors[0]?.backgroundColor || '#000';
            const dataIndex = tooltip.dataPoints[0]?.dataIndex;
            const actualValue = actualValues[dataIndex];

            const optionsList =
              optionsData && optionsData.length > 0
                ? optionsData[dataIndex]
                : [];
            const optionsId =
              listIdData && listIdData.length > 0 ? listIdData[dataIndex] : '';
            const optionsHtml = isTeam
              ? optionsList
                  .map((opt) => {
                    const colorRandom = getRandomColor();
                    return `<li style="display: flex; align-items: center; justify-content: space-between;">
                    <div style="display: flex; align-items: center;">
                    <div >
                      <svg
                        width="30"
                        height="30"
                        viewBox="0 0 36 36"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg">
                        <rect width="30" height="30" rx=${30 / 2} fill=${colorRandom} />
                        <mask
                          id="mask0_528_5"30""
                          style="mask-type: alpha"
                          maskUnits="userSpaceOnUse"
                          x="0"
                          y="0"
                          width="30"
                          height="30">
                          <rect width="30" height="30" rx=${30 / 2} fill=${colorRandom} />
                        </mask>
                        <g mask="url(#mask0_528_5"30")">
                          <rect
                            x=${30 * 0.19}
                            y=${30 * 0.57}
                            width=${30 * 0.62}
                            height=${30 * 0.62}
                            rx=${30 * 0.31}
                            fill="#F3F3F3"
                          />
                        </g>
                        <rect
                          x=${30 * 0.33}
                          y=${30 * 0.17}
                          width=${30 * 0.33}
                          height=${30 * 0.33}
                          rx=${30 * 0.17}
                          fill="#F3F3F3"
                        />
                      </svg>
                    </div>
                  <span style="display: inline-block; width: 80px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis;">
  ${opt.label}
</span>
                    </div>
                    <span>  ${opt.percent}%</span>
          </li>`;
                  })
                  .join('')
              : optionsList.map((opt) => `<li>${opt.label}</li>`).join('');

            let innerHtml = `
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 14px;">
          <div style="width: 12px; height: 12px; background: ${color}; border-radius: 2px;"></div>
          <span style="font-weight: bold; max-width: 105px; line-break: anywhere;">${title.join('<br>')}</span>
        </div>
      `;
            body.forEach((line) => {
              innerHtml += `<div style="display: flex; gap: 8px; font-size: 16px; font-weight: 400">
          <span>${line}% </span>
          <span>${actualValue}</span>
        </div>
        ${
          isClickTooltip &&
          `   <ul style="font-weight:400 ;margin-top: 16px; color: #77858F; display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis; word-break: break-word;">
                   ${optionsHtml}
           </ul>
           <div>
           ${
             !isTeam &&
             `
                       <div style="margin-top: 16px;display: flex; align-items: center; justify-content: end;">
    <button
    id="tooltip-button"
    data-label="${optionsId}"
      style="font-weight:400 ; display: flex; align-items: center; justify-content: center; gap: 8px; background: white; font-size: 12px; color: #77858F;  height: 34px; border-radius: 6px; text-decoration: none;"
    >
      <span>タスクを見る</span>
      <div style="display: flex; align-items: center; justify-content: center; width: 18px; height: 18px; background: #EBF1F7; border-radius: 50%; color: #77858F;">
        <img 
          src="/icons/right-statistic.svg" 
          alt="right" 
          style="height: 8px; width: auto; cursor: pointer; position: relative; left: 0.5px;"
        />
      </div>
    </button>
  </div>
        `
           }
           </div>`
        }
   
        `;
            });

            tooltipEl.innerHTML = innerHtml;
            setTimeout(() => {
              const button = document.getElementById('tooltip-button');

              if (button) {
                button.addEventListener('click', () => {
                  const label = button.getAttribute('data-label') || 'null';

                  window.dispatchEvent(
                    new CustomEvent('tooltipClick', { detail: label }),
                  );
                });
              }
            }, 0);
          }

          const canvas = context.chart.canvas;
          const position = canvas.getBoundingClientRect();

          tooltipEl.style.opacity = '1';
          tooltipEl.style.left = `${position.left + tooltip.caretX + window.pageXOffset}px`;
          tooltipEl.style.top = `${position.top + tooltip.caretY + window.pageYOffset}px`;
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

  useEffect(() => {
    const handleTooltipClick = (event: Event) => {
      const customEvent = event as CustomEvent<number | null>;
      handleClickTooltip && handleClickTooltip(customEvent.detail);
    };

    window.addEventListener(
      'tooltipClick',
      handleTooltipClick as EventListener,
    );
    return () =>
      window.removeEventListener(
        'tooltipClick',
        handleTooltipClick as EventListener,
      );
  }, [listIdData]);

  const chartRef = useRef<any>(null);
  const handleClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!chartRef.current) return;
    if (!isClickTooltip) return;

    const chart = chartRef.current;
    const points = chart.getElementsAtEventForMode(
      event.nativeEvent,
      'nearest',
      { intersect: true },
      true,
    );

    if (points.length) {
      const firstPoint = points[0];
      const dataIndex = firstPoint.index;

      const label = chartData.labels?.[dataIndex] || 'Unknown';
      const optionsId =
        listIdData && listIdData.length > 0 ? listIdData[dataIndex] : '';

      handleClickChart &&
        handleClickChart({
          label: label,
          value: optionsId || '',
        });
    }
  };

  return (
    <div
      onClick={(e: any) => {
        handleClick(e);
      }}
      className={`w-96 h-96 my-0 mx-auto ${className}`}>
      <Pie ref={chartRef} data={chartData} options={options} />
    </div>
  );
};

export default PieChart;
