import React, {
  Fragment,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import * as ReactDOM from 'react-dom/client';
import Image from 'next/image';
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
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  Popover,
  PopoverButton,
  PopoverPanel,
  Transition,
} from '@headlessui/react';

import ImageRound from '@components/common/ImageRound';
import Dropdown from '@components/common/Dropdown';
import { Table, TableBody } from '@components/common/Table';
import RowSkeleton from '@components/skeleton/RowSkeleton';
import ActionFilterStatisticTeam from '@components/modals/ActionFilterTeamStatistic';
import { TeamDockLineChartTooltip } from '@components/tooltip/TeamDockLineChartTooltip';
import RadioButton from '@components/common/RadioButton';
import CustomUserAvatar from '@components/common/AvatarIcon/CustomUserAvatar';
import CustomStatisticUserCheckbox from '@components/common/Checkbox/CustomStatisticUserCheckbox';

import { GlobalStateContext } from '@providers/GlobalStateProvider';
import { StatisticTeamStateContext } from '@providers/StatisticTeamProvider';

import { OptionDropdownType } from '@interfaces/common';
import { StatisticCategoryInfo } from '@interfaces/statistic';

import { SortingType, StatisticViewOptions } from '@constants/enums';
import {
  DEFAULT_TIME_TEXT,
  EVERYONE_OPTION_LABEL,
  STATISTIC_CHART_VIEW_OPTIONS,
} from '@constants';

import {
  convertDurationToTotalMinutes,
  convertTimeToDecimal,
  convertToStatisticJapaneseLabels,
  formatDateToYMD,
  totalDurationsForStatistic,
} from '@utils/date';
import {
  createStyledAvatarWithMargin,
  getAvatarIconSvg,
  getFileURL,
  getLineChartEnableViews,
  getRandomColor,
  getSafeTooltipLeft,
  toRGBA,
} from '@utils';

import useStatisticUserTaskDurations from '@hooks/useStatisticUserTaskDurations';
import useDebounceText from '@hooks/useDebounceText';
import useStatisticTableInTeamLineChart from '@hooks/useStatisticTableInTeamLineChart';
import { useGenericDebounce } from '@hooks/useGenericDebounce';

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

type Props = {
  startDate: Date;
  endDate: Date | null;
  removeTag: (selected: OptionDropdownType) => void;
  removeUser: (selected: OptionDropdownType) => void;
  handleSelectOrganization: (data: OptionDropdownType) => void;
  handleSelectLarge: (data: OptionDropdownType) => void;
  handleSelectMedium: (data: OptionDropdownType) => void;
};

interface TooltipDiv extends HTMLDivElement {
  _reactRoot?: ReactDOM.Root;
}

interface TableRowDetail {
  categoryId: number;
  categoryName: string;
  categoryDuration: string;
  categoryPercent: number;
  organizationId: number;
  userList: {
    userId: number;
    userName: string;
    userAvatar?: string | null;
    userAvatarColor: string;
    userDuration: string;
    userPercent: number;
  }[];
}

const LineChartByTeam = ({
  startDate,
  endDate,
  removeTag,
  removeUser,
  handleSelectOrganization,
  handleSelectLarge,
  handleSelectMedium,
}: Props) => {
  // Context
  const {
    listOptionsOrganization,
    largeOptions,
    mediumOptions,
    selectedLarge,
    selectedMedium,
    selectedOrganization,
    selectedSmall,
    tagsOptions,
    firstThreeUser,
    allLabelUser,
    remainingCountUser,
    firstThreeTag,
    allLabelTag,
    remainingCountTag,
    listMemberTeam,
    orderingOptions,
    lineChartViewBy,
    setLineChartViewBy,
  } = useContext(StatisticTeamStateContext);
  const { expanded, selectedOrganization: selectedOrganizationSideBar } =
    useContext(GlobalStateContext);

  // Selected members, category, organization
  const [selectedMembers, setSelectedMembers] = useState<number[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<{
    id: number;
    name: string;
  } | null>(null);
  const [isOrganizationChanging, setIsOrganizationChanging] = useState(false);
  const [selectedOrganizationInTable, setSelectedOrganizationInTable] =
    useState<number>(0);

  // Filter options
  const [filter, setFilter] = useState({
    fromDate: startDate ? `${formatDateToYMD(startDate)}` : '',
    endDate: endDate ? `${formatDateToYMD(endDate)}` : '',
    userIds: selectedMembers?.filter(Boolean).join(','),
    largeCategoryId:
      selectedOrganization && !selectedLarge && !selectedMedium
        ? selectedCategory?.id
        : selectedLarge?.value,
    mediumCategoryId:
      selectedOrganization && selectedLarge && !selectedMedium
        ? selectedCategory?.id
        : selectedMedium?.value,
    smallCategoryId:
      selectedOrganization && selectedLarge && selectedMedium
        ? selectedCategory?.id
        : selectedSmall?.value,
    statisticBy: `${lineChartViewBy?.value}`,
    selectedOrganization: 0,
    tagIds: orderingOptions?.tag_ids || [],
    organizationMemberId: String(selectedOrganizationSideBar?.value || ''),
  });
  const [isOpenModalFilter, setIsOpenModalFilter] = useState(false);
  const [memberOptions, setMemberOptions] = useState<
    {
      id: number;
      fullName: string;
      color: string;
      avatarUrl: string;
    }[]
  >([]);

  // Table data
  const [tableData, setTableData] = useState<TableRowDetail[]>([]);

  // Chart
  const chartRef = useRef<any>(null);
  const [images, setImages] = useState<CanvasImageSource[]>([]);
  const [legendList, setLegendList] = useState<
    {
      color: string;
      name: string;
    }[]
  >([]);
  const [lineChartData, setLineChartData] = useState<{
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      borderColor: string;
      backgroundColor: string;
      fill: boolean;
      tension: number;
      borderDash: any;
    }[];
  }>({
    labels: [],
    datasets: [],
  });
  const [totalDuration, setTotalDuration] = useState<string>('00:00:00');

  // Collapse statuses
  const [categoryCollapseStatuses, setCategoryCollapseStatuses] = useState<
    {
      categoryName: string;
      status: boolean;
    }[]
  >([]);
  // Sorting
  const [percentageSortingStatus, setPercentageSortingStatus] =
    useState<string>('');
  const [durationSortingStatus, setDurationSortingStatus] =
    useState<string>('');

  // Others
  const [isExtendData, setIsExtendData] = useState(true);
  const debouncedSelectedMembers = useDebounceText(
    selectedMembers?.filter(Boolean).join(','),
    1000,
  );
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  const buildTableDetail = (
    categories: {
      categoryId: number;
      categoryName: string;
      organizationId?: number;
      percent: number;
      duration: string;
      users?: {
        user: {
          id: number;
          fullName: string;
          avatar?: string | null;
          avatarColor: string;
        };
        duration: string;
        percent: number;
      }[];
    }[] = [],
  ) =>
    categories.map((category) => ({
      categoryId: category.categoryId,
      categoryName: category.categoryName,
      categoryPercent: category.percent,
      categoryDuration: category.duration,
      organizationId: category.organizationId ?? 0,
      userList:
        allLabelUser.length > 0
          ? allLabelUser.map((userInfo) => {
              const foundUser = category.users?.find(
                (user) => user.user.id == userInfo.value,
              );
              if (foundUser) {
                return {
                  userId: foundUser.user.id,
                  userName: foundUser.user.fullName,
                  userAvatar: foundUser.user.avatar,
                  userAvatarColor: foundUser.user.avatarColor,
                  userDuration: foundUser.duration,
                  userPercent: foundUser.percent,
                };
              }
              return {
                userId: Number(userInfo.value),
                userName: userInfo?.label,
                userAvatar: userInfo?.avatarUrl || '',
                userAvatarColor: userInfo?.color || '',
                userDuration: DEFAULT_TIME_TEXT,
                userPercent: 0,
              };
            })
          : [],
    }));

  const handleCategorySelection = (
    categoryList: StatisticCategoryInfo[] | undefined,
  ) => {
    if (categoryList?.length) {
      const [firstCategory] = categoryList;
      setSelectedCategory({
        id: firstCategory.categoryId,
        name: firstCategory.categoryName,
      });
      setSelectedOrganizationInTable(Number(firstCategory.organizationId));
      if (selectedOrganization && !selectedLarge && !selectedMedium) {
        setFilter((prev) => {
          return {
            ...prev,
            largeCategoryId: firstCategory.categoryId,
            selectedOrganization: Number(firstCategory.organizationId),
          };
        });
      } else if (selectedOrganization && selectedLarge && !selectedMedium) {
        setFilter((prev) => {
          return {
            ...prev,
            mediumCategoryId: firstCategory.categoryId,
            selectedOrganization: Number(firstCategory.organizationId),
          };
        });
      } else if (selectedOrganization && selectedLarge && selectedMedium) {
        setFilter((prev) => {
          return {
            ...prev,
            smallCategoryId: firstCategory.categoryId,
            selectedOrganization: Number(firstCategory.organizationId),
          };
        });
      }
    } else {
      setSelectedCategory(null);
      setSelectedOrganizationInTable(0);
      if (selectedOrganization && !selectedLarge && !selectedMedium) {
        setFilter((prev) => {
          return {
            ...prev,
            largeCategoryId: undefined,
            selectedOrganization: 0,
          };
        });
      } else if (selectedOrganization && selectedLarge && !selectedMedium) {
        setFilter((prev) => {
          return {
            ...prev,
            mediumCategoryId: undefined,
            selectedOrganization: 0,
          };
        });
      } else if (selectedOrganization && selectedLarge && selectedMedium) {
        setFilter((prev) => {
          return {
            ...prev,
            smallCategoryId: undefined,
            selectedOrganization: 0,
          };
        });
      }
    }
  };

  // Get table info (statistic team categories)
  const { isLoadingStatisticTableInTeamLineChart } =
    useStatisticTableInTeamLineChart({
      filter: {
        fromDate: formatDateToYMD(startDate) || '',
        endDate: formatDateToYMD(`${endDate}`) || '',
        organizationIds: String(selectedOrganization?.value || ''),
        largeCategoryId: selectedLarge?.value as number,
        mediumCategoryId: selectedMedium?.value as number,
        orderingOptions: orderingOptions,
        organizationMemberId: String(selectedOrganizationSideBar?.value || ''),
        userIds:
          orderingOptions?.user_ids?.length == 0
            ? (listMemberTeam ?? []).map((user) => Number(user.id)).join(',')
            : debouncedSelectedMembers,
      },
      onSuccess: (data) => {
        if (!data) return;
        let tableDetail: TableRowDetail[] = [];
        if (selectedOrganization && !selectedLarge && !selectedMedium) {
          tableDetail = buildTableDetail(data.largeCategories);
          handleCategorySelection(data.largeCategories);
        } else if (selectedOrganization && selectedLarge && !selectedMedium) {
          tableDetail = buildTableDetail(data.mediumCategories);
          handleCategorySelection(data.mediumCategories);
        } else if (selectedOrganization && selectedLarge && selectedMedium) {
          tableDetail = buildTableDetail(data.smallCategories);
          handleCategorySelection(data.smallCategories);
        }

        setCategoryCollapseStatuses(
          tableDetail.map((category) => {
            return {
              categoryName: category.categoryName,
              status: false,
            };
          }),
        );

        setTableData(tableDetail);

        // Calculate total duration
        const totalDurationList = (tableDetail || [])
          .map((item) => item.categoryDuration)
          .filter(Boolean); // remove null, undefined, ''
        setTotalDuration(totalDurationsForStatistic(totalDurationList));
      },
    });

  // Get user task durations
  const {
    statisticUserTaskDurationsList,
    isLoadingStatisticUserTaskDurationsList,
  } = useStatisticUserTaskDurations({
    filter: {
      ...filter,
      userIds:
        orderingOptions?.user_ids?.length == 0
          ? (listMemberTeam ?? []).map((user) => Number(user.id)).join(',')
          : filter.userIds,
    },
    condition: [
      Boolean(
        tableData.length > 0 &&
          (filter.largeCategoryId || filter.mediumCategoryId),
      ),
    ],
  });

  // Get initial member options
  useEffect(() => {
    if (allLabelUser.length > 0) {
      const allMembers = [
        {
          id: 0,
          fullName: EVERYONE_OPTION_LABEL,
          avatarUrl: '',
          color: '#0065B6',
        },
        ...allLabelUser.map((user) => {
          return {
            id: Number(user.value),
            fullName: user.label,
            color: String(user.color),
            avatarUrl: user?.avatarUrl || '',
          };
        }),
      ];
      setMemberOptions(allMembers);
      setSelectedMembers([...allMembers.map((user) => Number(user.id))]);
    } else {
      setMemberOptions([]);
      setSelectedMembers([]);
    }
  }, [allLabelUser]);

  // Handle listen to filter option changes
  const memoizedFilter = useMemo(() => {
    return {
      fromDate: startDate ? `${formatDateToYMD(startDate)}` : '',
      endDate: endDate ? `${formatDateToYMD(endDate)}` : '',
      userIds: selectedMembers?.filter(Boolean).join(','),
      largeCategoryId:
        selectedOrganizationInTable && !selectedLarge && !selectedMedium
          ? selectedCategory?.id
          : selectedLarge?.value,
      mediumCategoryId:
        selectedOrganizationInTable && selectedLarge && !selectedMedium
          ? selectedCategory?.id
          : selectedMedium?.value,
      smallCategoryId:
        selectedOrganizationInTable && selectedLarge && selectedMedium
          ? selectedCategory?.id
          : selectedSmall?.value,
      statisticBy: `${lineChartViewBy?.value}`,
      selectedOrganization: selectedOrganizationInTable,
      tagIds: orderingOptions?.tag_ids || [],
      organizationMemberId: String(selectedOrganizationSideBar?.value || ''),
    };
  }, [
    startDate,
    endDate,
    selectedMembers,
    selectedOrganizationInTable,
    selectedLarge,
    selectedMedium,
    selectedCategory?.id,
    selectedSmall?.value,
    lineChartViewBy?.value,
    orderingOptions?.tag_ids,
    selectedOrganizationSideBar?.value,
  ]);

  useEffect(() => {
    if (isOrganizationChanging && selectedMembers.length > 0) {
      setIsOrganizationChanging(false); // Done
    }
  }, [selectedMembers, isOrganizationChanging]);

  const debouncedFilter = useGenericDebounce(memoizedFilter, 1000);

  useEffect(() => {
    if (!isOrganizationChanging) {
      setFilter(debouncedFilter); // Trigger API only when everything is ready
    }
  }, [debouncedFilter, isOrganizationChanging]);

  // Hide tooltip when mouse leave over 80px
  useEffect(() => {
    let hideTimeout: ReturnType<typeof setTimeout> | null = null;

    const handleMouseMove = (e: MouseEvent) => {
      const tooltipEl = tooltipRef.current;
      if (!tooltipEl || tooltipEl.style.opacity === '0') {
        if (hideTimeout) {
          clearTimeout(hideTimeout);
          hideTimeout = null;
        }
        return;
      }

      const rect = tooltipEl.getBoundingClientRect();
      const mouseX = e.clientX;
      const mouseY = e.clientY;

      const distance = Math.max(
        rect.left - mouseX,
        mouseX - rect.right,
        rect.top - mouseY,
        mouseY - rect.bottom,
        0,
      );
      if (distance > 80) {
        if (!hideTimeout) {
          hideTimeout = setTimeout(() => {
            if (tooltipRef.current) {
              tooltipRef.current.style.display = 'none';

              // Reset line styles
              const chart = chartRef.current;
              chart?.data.datasets.forEach((ds: any, index: number) => {
                const meta = chart.getDatasetMeta(index);
                meta.dataset.options.borderColor = ds.borderColor;
              });
              chart?.update('none');
            }
            hideTimeout = null;
          }, 250); // delay before hiding tooltip
        }
      } else {
        // Mouse came back within 80px: cancel hide
        if (hideTimeout) {
          clearTimeout(hideTimeout);
          hideTimeout = null;
        }
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    return () => {
      if (hideTimeout) clearTimeout(hideTimeout);
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  // Render external tooltip
  const externalTooltipHandler = (context: any) => {
    const tooltipModel = context.tooltip;
    const tooltipEl = tooltipRef.current as TooltipDiv;

    if (!tooltipEl || !tooltipModel || !selectedCategory) return;

    if (!tooltipModel.dataPoints || tooltipModel.dataPoints.length === 0) {
      tooltipEl.style.display = 'none';
      return;
    }

    // Extract necessary data safely
    const dataIndex = tooltipModel.dataPoints[0]?.dataIndex;
    const datasetIndex = tooltipModel.dataPoints[0]?.datasetIndex;
    const dataset = context.chart.data.datasets[datasetIndex];

    if (!dataset?.data || dataIndex === undefined) {
      tooltipEl.style.display = 'none';
      return;
    }

    const dataPoint = tooltipModel.dataPoints[0]?.raw;
    if (!dataPoint) {
      tooltipEl.style.display = 'none';
      return;
    }

    const chart = context.chart;
    const hoveredUserId = tooltipModel.dataPoints[0]?.raw?.userId;

    chart.data.datasets.forEach((ds: any, index: number) => {
      const meta = chart.getDatasetMeta(index);

      // Ensure you have stored user.id in each dataset (e.g., ds.data[0].user.id)
      if (ds.data[0].userId == hoveredUserId) {
        // Highlight this user's line(s)
        meta.dataset.options.borderColor = toRGBA(ds.borderColor, 1);
      } else {
        // Dim others
        meta.dataset.options.borderColor = toRGBA(ds.borderColor, 0.5);
      }
    });

    // Hide tooltip for the last data point
    if (dataIndex === dataset.data.length - 1) {
      tooltipEl.style.display = 'none';
      return;
    }

    // Extract dataset label safely
    const matchingDataPoints = Array.from(
      lineChartData.datasets
        .flatMap((d) => d.data)
        .filter(
          (point: any) => point.x === dataPoint.x && point.y === dataPoint.y,
        ),
    );

    if (!tooltipEl._reactRoot) {
      tooltipEl._reactRoot = ReactDOM.createRoot(tooltipEl);
    }
    tooltipEl._reactRoot.render(
      <TeamDockLineChartTooltip
        data={matchingDataPoints}
        selectedOptionName={selectedCategory?.name || ''}
      />,
    );

    const { offsetLeft, offsetTop } = context.chart.canvas;
    const left = getSafeTooltipLeft({
      offsetLeft,
      caretX: tooltipModel.caretX,
      tooltipWidth: 220,
    });
    tooltipEl.style.left = `${left - 30}px`;
    tooltipEl.style.top = `${offsetTop + tooltipModel.caretY + 10}px`;
    tooltipEl.style.opacity = '1';
    tooltipEl.style.display = 'block';
    tooltipEl.style.zIndex = '9999';
    tooltipEl.style.pointerEvents = 'auto';
  };

  // Line chart options configuration
  const options: any = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'nearest',
      intersect: false,
    },
    plugins: {
      legend: {
        display: false, // Hides the legend
      },
      tooltip: {
        enabled: false, // Disable default tooltip
        position: 'nearest',
        external: externalTooltipHandler,
      },
      datalabels: {
        display: false,
      },
    },
    elements: {
      point: {
        radius: 4, // Adjust actual point size
        hitRadius: 20, // Increase hover detection area
        hoverRadius: 8, // Increase the highlight effect
        pointStyle: (ctx: any) => getPointStyle(ctx),
      },
    },
    datasets: {
      line: {
        clip: false,
      },
    },
    scales: {
      x: {
        ticks: {
          color: '#77858F',
          font: {
            size: 14,
            weight: 500,
          },
          padding: 15,
          callback: function (this: { chart: any }, index: number) {
            const chart = this.chart;
            const labels = chart.data.labels as string[];

            if (!labels || index >= labels.length) return '';

            const isEdge = index === 0 || index === labels.length - 1;
            const labelDate = new Date(labels[index]);
            const currentMonth = labelDate.getMonth();

            // Add extra spaces to reduce gap for first & last labels
            if (lineChartViewBy?.value != StatisticViewOptions.MONTH)
              return convertToStatisticJapaneseLabels(
                labels[index],
                lineChartViewBy?.value as string,
                isEdge,
              );

            // Logic for MONTH view
            let sameMonthAsNeighbor = false;

            if (index === 0 && labels.length > 1) {
              const nextMonth = new Date(labels[1]).getMonth();
              sameMonthAsNeighbor = currentMonth === nextMonth;
            } else if (index === labels.length - 1 && labels.length > 1) {
              const prevMonth = new Date(labels[labels.length - 2]).getMonth();
              sameMonthAsNeighbor = currentMonth === prevMonth;
            }

            return convertToStatisticJapaneseLabels(
              labels[index],
              lineChartViewBy?.value as string,
              isEdge && sameMonthAsNeighbor,
            );
          },
        },
      },
      y: {
        position: 'right',
        min: 0,
        ticks: {
          color: '#77858F',
          font: {
            size: 14,
            weight: 500,
          },
          padding: 15,
          stepSize: 10,
        },
      },
    },
  };

  // Load images after calling API
  useEffect(() => {
    if (
      statisticUserTaskDurationsList &&
      statisticUserTaskDurationsList.length > 0
    ) {
      const loadImages = async () => {
        if (statisticUserTaskDurationsList.length === 0) {
          return;
        }

        const imagePromises = statisticUserTaskDurationsList.map(
          async (userTaskDuration) => {
            const { user } = userTaskDuration;
            let avatarUrl = '';

            if (user.avatar) {
              avatarUrl = getFileURL(user.avatar);
            } else {
              const svgString = getAvatarIconSvg(user.avatarColor, 24);
              const blob = new Blob([svgString], { type: 'image/svg+xml' });
              avatarUrl = URL.createObjectURL(blob);
            }

            const styledAvatar = await createStyledAvatarWithMargin(
              avatarUrl,
              24,
              30,
            );
            return styledAvatar;
          },
        );

        const loadedImages = await Promise.all(imagePromises);
        setImages(loadedImages);
      };

      loadImages();
    } else {
      setImages([]);
    }
  }, [statisticUserTaskDurationsList]);

  // Get point style for line chart
  const getPointStyle = (context: any): (CanvasImageSource | string)[] => {
    const datasetIndex = context.datasetIndex;
    const dataLength = context.chart.data.labels.length;
    const styleArray: (CanvasImageSource | string)[] = [];
    for (let i = 0; i < dataLength; i++) {
      if (i === 0) {
        styleArray.push(images[datasetIndex] || 'circle');
      } else {
        styleArray.push('circle');
      }
    }
    return styleArray;
  };

  // Set chart data, legend list after calling API
  useEffect(() => {
    if (
      statisticUserTaskDurationsList &&
      statisticUserTaskDurationsList.length > 0
    ) {
      const labelList: string[] = [];
      const legendList: { name: string; color: string }[] = [];
      const datasets: any[] = [];

      const durationList = statisticUserTaskDurationsList[0].durations;
      durationList.map((duration, index) => {
        labelList.push(duration.startDate);
        if (
          index === durationList.length - 1 &&
          String(durationList.at(-1)?.endDate) !=
            String(durationList.at(-1)?.startDate)
        ) {
          const endDate = durationList.at(-1)?.endDate;
          if (endDate) {
            labelList.push(endDate);
          }
        }
      });

      statisticUserTaskDurationsList.forEach((userTaskDuration) => {
        legendList.push({
          color: userTaskDuration.user.avatarColor || getRandomColor(),
          name: userTaskDuration.user.fullName,
        });
        datasets.push({
          label: userTaskDuration.user.fullName,
          data: userTaskDuration.durations.flatMap((duration, index) => [
            {
              x: duration.startDate,
              y: duration.duration
                ? convertTimeToDecimal(duration.duration)
                : 0,
              endDate: duration.endDate,
              avatarColor: userTaskDuration.user.avatarColor,
              avatar: userTaskDuration.user.avatar || '',
              userId: userTaskDuration.user.id,
              label: userTaskDuration.user.fullName,
            },
            ...(index === userTaskDuration.durations.length - 1 &&
            String(duration.endDate) != String(duration.startDate)
              ? [
                  {
                    x: duration.endDate,
                    y: duration.duration
                      ? convertTimeToDecimal(duration.duration)
                      : 0,
                    endDate: duration.endDate,
                    avatarColor: userTaskDuration.user.avatarColor,
                    avatar: userTaskDuration.user.avatar || '',
                    userId: userTaskDuration.user.id,
                    label: userTaskDuration.user.fullName,
                  },
                ]
              : []),
          ]),
          borderColor: userTaskDuration.user.avatarColor || getRandomColor(),
          backgroundColor: 'transparent',
          fill: true,
          tension: 0,
          pointRadius: 4,
          pointBorderColor: 'transparent',
          pointHoverRadius: 6,
          pointHoverBackgroundColor:
            userTaskDuration.user.avatarColor || getRandomColor(),
          pointHoverBorderColor: 'transparent',
          pointHoverBorderWidth: 2,
        });
      });

      setLineChartData({
        labels: labelList,
        datasets: datasets,
      });
      setLegendList(legendList);
    } else {
      setLineChartData({
        labels: [],
        datasets: [],
      });
      setLegendList([]);
    }
  }, [statisticUserTaskDurationsList]);

  // Sort by percent difference
  const sortByPercentDifference = (
    data: TableRowDetail[],
    sortingType: string,
  ) => {
    const sortedArr = data.slice().sort((rowA, rowB) => {
      const rowAPercentage = Number(rowA.categoryPercent || 0);
      const rowBPercentage = Number(rowB.categoryPercent || 0);

      return sortingType == SortingType.ASC
        ? rowAPercentage - rowBPercentage
        : rowBPercentage - rowAPercentage;
    });
    setTableData(sortedArr);
  };

  // Sort by duration difference
  const sortByDurationDifference = (
    data: TableRowDetail[],
    sortingType: string,
  ) => {
    const sortedArr = data.slice().sort((rowA, rowB) => {
      const rowADuration = convertDurationToTotalMinutes(
        rowA.categoryDuration || '00:00:00',
      );
      const rowBDuration = convertDurationToTotalMinutes(
        rowB.categoryDuration || '00:00:00',
      );

      return sortingType == SortingType.ASC
        ? rowADuration - rowBDuration
        : rowBDuration - rowADuration;
    });
    setTableData(sortedArr);
  };

  // Columns definition
  const columns: ColumnDef<TableRowDetail>[] = [
    {
      accessorKey: 'categoryName',
      header: () => {
        return (
          <p className="text-[#77858F] font-medium text-xs text-left px-[40px]">
            カテゴリー名
          </p>
        );
      },
      cell: (info) => {
        const value = info.getValue() as string;
        const collapseStatus =
          categoryCollapseStatuses.find(
            (categoryCollapseStatus) =>
              categoryCollapseStatus.categoryName ==
              info.row.original.categoryName,
          )?.status || false;
        return (
          <div className="flex items-start px-[18px]">
            <RadioButton
              name="lineChartCategoryName"
              isChecked={
                info.row.original.categoryName == selectedCategory?.name
              }
              onChange={(e: any) => {
                if (e) {
                  setSelectedCategory({
                    id: info.row.original.categoryId,
                    name: info.row.original.categoryName,
                  });
                  setSelectedOrganizationInTable(
                    info.row.original.organizationId,
                  );
                  if (
                    selectedOrganization &&
                    !selectedLarge &&
                    !selectedMedium
                  ) {
                    setFilter((prev) => {
                      return {
                        ...prev,
                        largeCategoryId: info.row.original.categoryId,
                        selectedOrganization: info.row.original.organizationId,
                      };
                    });
                  } else if (
                    selectedOrganization &&
                    selectedLarge &&
                    !selectedMedium
                  ) {
                    setFilter((prev) => {
                      return {
                        ...prev,
                        mediumCategoryId: info.row.original.categoryId,
                        selectedOrganization: info.row.original.organizationId,
                      };
                    });
                  } else if (
                    selectedOrganization &&
                    selectedLarge &&
                    selectedMedium
                  ) {
                    setFilter((prev) => {
                      return {
                        ...prev,
                        smallCategoryId: info.row.original.categoryId,
                        selectedOrganization: info.row.original.organizationId,
                      };
                    });
                  }
                }
              }}
            />
            <div className="w-full">
              <div
                className={`flex justify-between items-center w-full ${
                  collapseStatus &&
                  info.row.original?.userList?.filter((user) =>
                    selectedMembers.includes(user.userId),
                  ).length > 0 &&
                  'mb-3'
                }`}>
                <p className="break-all text-[16px] font-medium max-w-[calc(100%_-_40px)] line-clamp-1 text-left text-black">
                  {value}
                </p>{' '}
                <div className="w-[20px]">
                  <ImageRound
                    src="/icons/extend-column.svg"
                    name="Extend column"
                    className={`!w-3 !h-3 ml-auto hover:cursor-pointer ${collapseStatus ? '-rotate-90' : 'rotate-90'}`}
                    style={{
                      width: `8px`,
                      height: `12px`,
                    }}
                    onClick={() => {
                      setCategoryCollapseStatuses((prev) => {
                        return prev.map((item) =>
                          item.categoryName == info.row.original.categoryName
                            ? { ...item, status: !item.status }
                            : item,
                        );
                      });
                    }}
                  />
                </div>
              </div>
              {collapseStatus &&
                info.row.original?.userList &&
                info.row.original?.userList.length > 0 && (
                  <div className="flex flex-col">
                    {info.row.original?.userList
                      ?.filter((user) => selectedMembers.includes(user.userId))
                      .map((user) => {
                        return (
                          <div
                            key={user.userId}
                            className="flex items-center gap-2 border-t-[1px] border-[#D2DBE1] py-2">
                            <CustomUserAvatar
                              avatarUrl={user?.userAvatar || ''}
                              avatarColor={user?.userAvatarColor || ''}
                              size={24}
                            />
                            <p className="text-sm font-medium max-w-full break-all line-clamp-1 text-left text-black">
                              {user.userName}
                            </p>
                          </div>
                        );
                      })}
                  </div>
                )}
            </div>
          </div>
        );
      },
      enableSorting: false,
    },
    {
      accessorKey: 'categoryDuration',
      size: 50,
      header: () => {
        return (
          <div
            className="flex gap-1 items-center justify-center"
            onClick={() => {
              if (
                !durationSortingStatus ||
                durationSortingStatus == SortingType.DESC
              ) {
                setDurationSortingStatus(SortingType.ASC);
                sortByDurationDifference(tableData, SortingType.ASC);
              } else {
                setDurationSortingStatus(SortingType.DESC);
                sortByDurationDifference(tableData, SortingType.DESC);
              }
            }}>
            <p className="!text-xs font-medium !text-[#77858F]">計測時間</p>
            <div>
              <Image
                src="/icons/sort-down.svg"
                alt="Sort down"
                width={9}
                height={10}
                className={`cursor-pointer justify-self-end ${durationSortingStatus == SortingType.ASC && 'rotate-180'} `}
              />
            </div>
          </div>
        );
      },
      enableSorting: false,
      cell: (info) => {
        const value = info.getValue() as string;
        const collapseStatus =
          categoryCollapseStatuses.find(
            (categoryCollapseStatus) =>
              categoryCollapseStatus.categoryName ==
              info.row.original.categoryName,
          )?.status || false;

        return (
          <div className="flex flex-col font-medium text-[14px] text-black px-[18px]">
            <div
              className={`flex justify-center ${
                collapseStatus &&
                info.row.original?.userList?.filter((user) =>
                  selectedMembers.includes(user.userId),
                ).length > 0 &&
                'mb-3'
              }`}>
              <p>{value.split(':')[0] || 0}時間</p>
              <p>{value.split(':')[1] || 0}分</p>
            </div>
            {collapseStatus &&
              info.row.original?.userList &&
              info.row.original?.userList.length > 0 && (
                <div className="flex flex-col">
                  {info.row.original?.userList
                    ?.filter((user) => selectedMembers.includes(user.userId))
                    .map((user) => {
                      return (
                        <div
                          key={user.userId}
                          className="flex justify-center border-t-[1px] border-[#D2DBE1] py-2">
                          <p>{user.userDuration.split(':')[0] || 0}時間</p>
                          <p>{user.userDuration.split(':')[1] || 0}分</p>
                        </div>
                      );
                    })}
                </div>
              )}
          </div>
        );
      },
    },
    {
      accessorKey: 'categoryPercent',
      size: 30,
      header: () => {
        return (
          <div
            className="flex gap-1 items-center justify-center cursor-pointer"
            onClick={() => {
              if (
                !percentageSortingStatus ||
                percentageSortingStatus == SortingType.DESC
              ) {
                setPercentageSortingStatus(SortingType.ASC);
                sortByPercentDifference(tableData, SortingType.ASC);
              } else {
                setPercentageSortingStatus(SortingType.DESC);
                sortByPercentDifference(tableData, SortingType.DESC);
              }
            }}>
            <p className="!text-xs font-medium !text-[#77858F]">割合</p>
            <div>
              <Image
                src="/icons/sort-down.svg"
                alt="Sort down"
                width={9}
                height={10}
                className={`cursor-pointer justify-self-end ${
                  percentageSortingStatus == SortingType.ASC ? 'rotate-180' : ''
                }`}
              />
            </div>
          </div>
        );
      },
      enableSorting: false,
      cell: (info) => {
        const value = Number(info.getValue()) || 0;
        const collapseStatus =
          categoryCollapseStatuses.find(
            (categoryCollapseStatus) =>
              categoryCollapseStatus.categoryName ==
              info.row.original.categoryName,
          )?.status || false;

        return (
          <div className="flex flex-col font-medium text-[14px] text-black px-[18px]">
            <p
              className={`flex justify-center ${
                collapseStatus &&
                info.row.original?.userList?.filter((user) =>
                  selectedMembers.includes(user.userId),
                ).length > 0 &&
                'mb-3'
              }`}>
              {Math.round(value)}%
            </p>
            {collapseStatus &&
              info.row.original?.userList &&
              info.row.original?.userList.length > 0 && (
                <div className="flex flex-col">
                  {info.row.original?.userList
                    ?.filter((user) => selectedMembers.includes(user.userId))
                    .map((user) => {
                      return (
                        <div
                          key={user.userId}
                          className="flex justify-center border-t-[1px] border-[#D2DBE1] py-2">
                          <p>{user.userPercent || 0}%</p>
                        </div>
                      );
                    })}
                </div>
              )}
          </div>
        );
      },
    },
    {
      id: 'empty-column',
      header: '',
      cell: () => <div></div>,
    },
  ];

  const table = useReactTable({
    data: tableData,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  // Get disable views in view options
  const getDisableViews = () => {
    const allViews = [
      StatisticViewOptions.DAY,
      StatisticViewOptions.WEEK,
      StatisticViewOptions.MONTH,
    ];

    const enabledViews = getLineChartEnableViews(startDate, endDate as Date);

    return allViews.filter((view) => !enabledViews.includes(view));
  };

  return (
    <div
      style={{
        boxShadow: '0px 4px 10px 0px #0000000D',
      }}
      className="p-[30px] bg-[#F8FAFC] mt-5 rounded-[14px]">
      {/* Header & sort */}
      <div className="flex justify-between">
        <div className="flex items-center gap-x-5">
          <div className="flex items-center gap-[10px] ">
            <ImageRound
              className={`w-7 h-4  hover:cursor-pointer relative top-[2px]`}
              name="statistic line chart icon"
              src={`/icons/statistic-line-chart.svg`}
            />
            <span className="text-black w-[210px] flex-shrink-0  font-semibold text-[18px] relative top-[2px]">
              期間における時間の推移
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-shrink-0 h-6 relative">
              {/* Filter option modal */}
              <Popover className="relative">
                {() => (
                  <>
                    <div className="flex items-center gap-2 relative top-[5px]">
                      <PopoverButton
                        onClick={() => setIsOpenModalFilter(!isOpenModalFilter)}
                        className="flex items-center gap-2 text-xs font-medium text-[#77858F] focus-visible:outline-none">
                        <ImageRound
                          src="/icons/filter.svg"
                          name="Filter icon"
                          className="w-[14px] h-[14px]"
                        />
                      </PopoverButton>
                    </div>
                    <Transition
                      as={Fragment}
                      show={isOpenModalFilter}
                      enter="transition ease-out duration-200"
                      enterFrom="opacity-0 translate-y-1"
                      enterTo="opacity-100 translate-y-0"
                      leave="transition ease-in duration-150"
                      leaveFrom="opacity-100 translate-y-0"
                      leaveTo="opacity-0 translate-y-1">
                      <PopoverPanel className="absolute left-[30px] top-[-5px] z-[1] w-[400px] transform">
                        <ActionFilterStatisticTeam
                          tagsOptions={tagsOptions}
                          handleClose={() => setIsOpenModalFilter(false)}
                          listMemberTeam={listMemberTeam}
                        />
                      </PopoverPanel>
                    </Transition>
                  </>
                )}
              </Popover>
            </div>
            <div className=" flex-grow flex-shrink-0">
              <div className="flex gap-2 flex-wrap  flex-shrink-0 ">
                <>
                  {firstThreeUser.map((item, index) => {
                    return (
                      <div
                        key={item.value}
                        className="flex gap-[6px] items-center">
                        {index === 0 && (
                          <ImageRound
                            src={`/icons/user-white.svg`}
                            name="close"
                            className="w-fit h-fit cursor-pointer"
                          />
                        )}
                        <div className="min-w-[66px] w-fit  h-6 px-[10px] bg-[#77858F] justify-between gap-[6px] text-xs text-white font-medium flex items-center truncate rounded-[20px] ">
                          <span className="min-w-[32px] max-w-[118px]  truncate">
                            {item.label}
                          </span>
                          <ImageRound
                            onClick={() => {
                              removeUser(item);
                            }}
                            src={`/icons/close-white.svg`}
                            name="close"
                            className="w-fit h-fit cursor-pointer"
                          />
                        </div>
                      </div>
                    );
                  })}
                  {allLabelUser.length > 3 && (
                    <p className=" h-6 flex items-center justify-center rounded-[20px] bg-[#EBF1F7] text-black text-xs font-medium">
                      +{remainingCountUser}
                    </p>
                  )}
                </>
                <>
                  {firstThreeTag.map((item, index) => {
                    return (
                      <div
                        key={item.value}
                        className="flex gap-[6px] items-center">
                        {index === 0 && (
                          <ImageRound
                            src={`/icons/tag-white.svg`}
                            name="close"
                            className="w-fit h-fit cursor-pointer"
                          />
                        )}
                        <div className="min-w-[66px] w-fit  h-6 px-[10px] bg-[#77858F] justify-between gap-[6px] text-xs text-white font-medium flex items-center truncate rounded-[20px] ">
                          <span className="min-w-[32px] max-w-[118px]  truncate">
                            {item.label}
                          </span>
                          <ImageRound
                            onClick={() => {
                              removeTag(item);
                            }}
                            src={`/icons/close-white.svg`}
                            name="close"
                            className="w-fit h-fit cursor-pointer"
                          />
                        </div>
                      </div>
                    );
                  })}
                  {allLabelTag.length > 3 && (
                    <p className="pr-[10px] h-6 flex items-center justify-center rounded-[20px] bg-[#EBF1F7] text-black text-xs font-medium">
                      +{remainingCountTag}
                    </p>
                  )}
                </>
              </div>
            </div>
          </div>
        </div>
        <ImageRound
          src="/icons/extend-calendar.svg"
          name="Extend calendar"
          className={`!w-3 !h-3 hover:cursor-pointer ${
            isExtendData ? '-rotate-90' : 'rotate-90'
          }`}
          onClick={() => {
            setIsExtendData(!isExtendData);
          }}
        />
      </div>
      {isExtendData && (
        <div>
          {/* Line */}
          <div className="w-full border-t border-[#D2DBE1] my-[30px]"></div>
          <div>
            <div className="flex  justify-between px-[30px] text-sm font-medium">
              {/* Column Chart 1 */}
              <div className="w-[300px] flex flex-col items-center">
                <div
                  className={`${selectedOrganization && !selectedLarge && !selectedMedium ? 'text-white bg-[#0068B6]' : 'text-[#77858F] bg-[#fff] border-[#77858F] border-[1px]'} rounded-[100px] w-[112px] h-[34px] text-sm flex justify-center items-center`}>
                  大カテゴリー
                </div>
                <div className="mt-4 w-full">
                  <Dropdown
                    label="チーム選択"
                    placeholder="-"
                    placeholderClass="!text-black text-sm font-normal"
                    className="!h-[34px] !rounded-md !border text-sm font-normal !py-0 !border-[#77858F] "
                    labelTextClass="!text-[#77858F] !text-xs !font-medium"
                    classNameOption="!text-sm"
                    options={listOptionsOrganization}
                    selectedOption={selectedOrganization || undefined}
                    onChange={(data) => {
                      setSelectedMembers([]);
                      setTableData([]);
                      setIsOrganizationChanging(true);
                      handleSelectOrganization(data);
                    }}
                  />
                </div>
              </div>
              {/* Column Chart 2 */}
              <div className="w-[300px] flex flex-col items-center">
                <div
                  className={`${selectedOrganization && selectedLarge && !selectedMedium ? 'text-white bg-[#0068B6]' : 'text-[#77858F] bg-[#fff] border-[#77858F] border-[1px]'} rounded-[100px] w-[112px] h-[34px] text-sm flex justify-center items-center`}>
                  中カテゴリー
                </div>
                <div className="mt-4 w-full">
                  <Dropdown
                    label="大カテゴリー選択"
                    placeholder="-"
                    placeholderClass="!text-black text-sm font-normal"
                    className="!h-[34px] !rounded-md  text-sm font-normal !py-0 !border !border-[#77858F]"
                    labelTextClass="!text-[#77858F] !text-xs !font-medium"
                    classNameOption="!text-sm"
                    options={largeOptions}
                    selectedOption={selectedLarge || undefined}
                    onChange={(data) => {
                      setTableData([]);
                      handleSelectLarge(data);
                    }}
                    disabled={!selectedOrganization}
                  />
                </div>
              </div>
              {/* Column Chart 3 */}
              <div className="w-[300px] flex flex-col items-center">
                <div
                  className={`${selectedOrganization && selectedLarge && selectedMedium ? 'text-white bg-[#0068B6]' : 'text-[#77858F] bg-[#fff] border-[#77858F] border-[1px]'} rounded-[100px] w-[112px] h-[34px] text-sm flex justify-center items-center`}>
                  小カテゴリー
                </div>
                <div className="mt-4 w-full">
                  <Dropdown
                    label="中カテゴリー選択"
                    placeholder="-"
                    placeholderClass="!text-black text-sm font-normal"
                    className="!h-[34px] !rounded-md text-sm font-normal !py-0 !border !border-[#77858F]"
                    labelTextClass="!text-[#77858F] !text-xs !font-medium"
                    classNameOption="!text-sm"
                    options={mediumOptions}
                    selectedOption={selectedMedium || undefined}
                    onChange={(data) => {
                      setTableData([]);
                      handleSelectMedium(data);
                    }}
                    disabled={!selectedLarge}
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="mt-5 px-[30px]">
            <div className="flex justify-between w-full mb-4">
              <div className="flex gap-2 items-end font-medium">
                <p>合計時間</p>
                <div className="flex gap-1 items-baseline">
                  <p className="text-[34px] leading-none">
                    {totalDuration?.split(':')[0]}
                  </p>
                  <p className="text-[25px] leading-none">時間</p>
                </div>
                <div className="flex gap-1 items-baseline">
                  <p className="text-[34px] leading-none">
                    {totalDuration?.split(':')[1]}
                  </p>
                  <p className="text-[25px] leading-none">分</p>
                </div>
              </div>
              <div>
                <Dropdown
                  options={STATISTIC_CHART_VIEW_OPTIONS}
                  selectedOption={STATISTIC_CHART_VIEW_OPTIONS.find(
                    (element) => element.value === lineChartViewBy?.value,
                  )}
                  className="h-[34px] !w-[54px] !border-[#77858F] border-[1px] rounded-[6px] text-xs !py-1 !pr-0 !shadow-none"
                  classNameTextData="!text-xs"
                  classActive="!text-sm"
                  classNameOption="!text-sm !w-[54px] !border-[#77858F] !ring-[#77858F] !ring-opacity-100"
                  labelOptionClass="!text-sm font-medium"
                  onChange={(e) => {
                    setTableData([]);
                    setLineChartViewBy({
                      label: e.label,
                      value: e.value,
                    });
                  }}
                  disableItems={getDisableViews()}
                />
              </div>
            </div>
          </div>
          {memberOptions?.length > 0 ? (
            <>
              <p className="px-8 text-xs font-medium text-[#77858F] mb-[14px]">
                表示させるメンバー
              </p>
              <div className="flex items-center flex-wrap gap-x-[30px] gap-y-[10px] px-8 mb-[10px]">
                {memberOptions.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-2 cursor-pointer">
                    <div className="w-4">
                      <CustomStatisticUserCheckbox
                        id={String(member.id)}
                        isChecked={selectedMembers.includes(member.id)}
                        color={member.color}
                        onChange={(state) => {
                          setTableData([]);
                          if (state) {
                            setSelectedMembers((prev) => {
                              if (member.id) {
                                const foundMember = selectedMembers.find(
                                  (memberId) => memberId == member.id,
                                );
                                if (!foundMember) {
                                  return [...prev, member.id];
                                }
                                return [...prev];
                              } else {
                                return memberOptions.map((member) => member.id);
                              }
                            });
                          } else {
                            setSelectedMembers((prev) => {
                              if (member.id) {
                                const foundMember = selectedMembers.find(
                                  (memberId) => memberId == member.id,
                                );
                                if (foundMember) {
                                  return [...prev].filter(
                                    (memberId) =>
                                      memberId && memberId != member.id,
                                  );
                                }
                                return [...prev];
                              } else {
                                return [];
                              }
                            });
                          }
                        }}
                      />
                    </div>
                    {member.id ? (
                      <div className="relative top-[2px]">
                        <CustomUserAvatar
                          avatarUrl={member?.avatarUrl || ''}
                          avatarColor={member?.color || ''}
                          size={30}
                        />
                      </div>
                    ) : (
                      <></>
                    )}

                    <span className="break-all max-w-[800px] w-full truncate text-sm">
                      {member.fullName}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <></>
          )}

          {!isLoadingStatisticUserTaskDurationsList &&
          !isLoadingStatisticTableInTeamLineChart ? (
            <div
              style={{ position: 'relative' }}
              className={`h-[380px] ${expanded && 'w-[calc(100%_-_10px)]'}`}>
              <Line ref={chartRef} data={lineChartData} options={options} />
              <div
                ref={tooltipRef}
                style={{ position: 'absolute', opacity: 0 }}
              />
            </div>
          ) : (
            <RowSkeleton
              numberOfRows={1}
              className={`!h-[395px] w-[calc(100%_-_60px)] mx-auto`}
            />
          )}

          <div className="px-[30px]">
            {!isLoadingStatisticUserTaskDurationsList &&
              !isLoadingStatisticTableInTeamLineChart && (
                <div className="flex gap-8 items-center justify-end flex-wrap">
                  {legendList.map((label, index) => {
                    return (
                      <div key={index} className="flex gap-1 items-center">
                        <div
                          className="w-8 h-1"
                          style={{ backgroundColor: label.color }}></div>
                        <p className="font-medium text-[#77858F] text-xs truncate max-w-[200px]">
                          {label.name}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}

            {isLoadingStatisticTableInTeamLineChart ? (
              <RowSkeleton
                numberOfRows={1}
                className={`!h-[200px] mt-5 w-full mx-auto`}
              />
            ) : (
              <Table className="border border-[#D2DBE1] !ring-0 bg-white !pt-0 py-0 mt-5 rounded-md">
                <thead>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr
                      key={headerGroup.id}
                      className="text-[#77858F] bg-[#F8FAFC] font-medium text-xs text-left">
                      {headerGroup.headers.map((header, index) => (
                        <th
                          key={header.id}
                          className={`py-2.5 cursor-pointer ${index !== 0 ? 'border-l' : ''}`}
                          style={{
                            width: header.getSize(),
                            minWidth: header.getSize(),
                            maxWidth: header.getSize(),
                          }}
                          onClick={header.column.getToggleSortingHandler()}>
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <TableBody>
                  {table.getRowModel().rows.map((row) => (
                    <tr key={row.id} className="hover:bg-gray-50">
                      {row.getVisibleCells().map((cell, index) => (
                        <td
                          key={cell.id}
                          style={{
                            width: cell.column.getSize(),
                            minWidth: cell.column.getSize(),
                            maxWidth: cell.column.getSize(),
                          }}
                          className={`py-3 !px-0 ${index !== 0 ? 'border-l' : ''}`}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
export default LineChartByTeam;
