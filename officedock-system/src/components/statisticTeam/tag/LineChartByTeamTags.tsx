import React, {
  Fragment,
  useContext,
  useEffect,
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

import ImageRound from '@components/common/ImageRound';
import Dropdown from '@components/common/Dropdown';
import { Table, TableBody } from '@components/common/Table';
import RowSkeleton from '@components/skeleton/RowSkeleton';
import { TeamDockLineChartTooltip } from '@components/tooltip/TeamDockLineChartTooltip';
import RadioButton from '@components/common/RadioButton';
import CustomUserAvatar from '@components/common/AvatarIcon/CustomUserAvatar';
import CustomStatisticUserCheckbox from '@components/common/Checkbox/CustomStatisticUserCheckbox';
import StatisticLineChartTableSkeleton from '@components/common/SkeletonLoading/StatisticLineChartTableSkeleton';

import { GlobalStateContext } from '@providers/GlobalStateProvider';
import { StatisticTeamTagsStateContext } from '@providers/StatisticTeamProviderTag';

import { OptionDropdownType } from '@interfaces/common';
import {
  CategoryLineChartDatasetInfo,
  StatisticCategoryInfo,
  StatisticsCategories,
  StatisticsUserTaskDuration,
  TagTableRowDetail,
} from '@interfaces/statistic';
import { TooltipDiv } from '@interfaces/tooltip';

import {
  AllTeamStatisticOption,
  OrganizationStatisticType,
  SortingType,
  StatisticViewOptions,
} from '@constants/enums';
import {
  ALL_TEAM_STATISTIC,
  DEFAULT_TIME_TEXT,
  EVERYONE_OPTION_LABEL,
  NO_SETTING,
  STATISTIC_CHART_VIEW_OPTIONS,
  STATISTIC_MAX_PERCENTAGE,
} from '@constants';

import {
  convertDurationToTotalMinutes,
  convertTimeToDecimal,
  convertToStatisticJapaneseLabels,
  extractDateLabelsListFromTaskDuration,
  formatDateToYMD,
  totalDurationsForStatistic,
} from '@utils/date';
import {
  createLineChartAvatarImage,
  getLineChartEnableViews,
  getRandomColor,
  getSafeTooltipLeft,
  getStatisticMilestones,
  normalizeDurationUsersWithTeamDockStatisticAllTeam,
  toRGBA,
} from '@utils';

import useStatisticUserTaskDurations from '@hooks/useStatisticUserTaskDurations';
import useStatisticTableInTeamTagLineChart from '@hooks/useStatisticTableInTeamTagLineChart';
import useStatisticTeamDockAllTeamLineChartTaskDurations from '@hooks/useStatisticTeamDockAllTeamLineChartTaskDurations';
import FilterTagTeam from './filter/FilterTagTeam';

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
  statisticTagsListTeam: StatisticsCategories | undefined;
  handleSelectOrganization: (data: OptionDropdownType) => void;
  handleSelectLarge: (data: OptionDropdownType) => void;
  handleSelectMedium: (data: OptionDropdownType) => void;
  handleSelectSmall: (data: OptionDropdownType) => void;
};

const LineChartByTeamTags = ({
  startDate,
  endDate,
  statisticTagsListTeam,
  handleSelectOrganization,
  handleSelectLarge,
  handleSelectMedium,
  handleSelectSmall,
}: Props) => {
  // Context
  const {
    isDisableCalendar,
    isHasLoading,
    listOptionsOrganization,
    largeOptions,
    mediumOptions,
    smallOptions,
    selectedLarge,
    selectedMedium,
    selectedOrganization,
    selectedSmall,
    listMemberTeam,
    lineChartViewBy,
    allLabelUser,
    orderingOptions,
    lineChartTableData,
    setLineChartViewBy,
    setLineChartTableData,
  } = useContext(StatisticTeamTagsStateContext);

  const { expanded, selectedOrganization: selectedOrganizationSideBar } =
    useContext(GlobalStateContext);
  // Selected members and category
  const [selectedMembers, setSelectedMembers] = useState<number[]>([]);
  const [selectedTag, setSelectedTag] = useState<{
    id: number | string;
    name: string;
    organizationId?: number | string;
  } | null>(null);
  const [selectedOrganizationInTable, setSelectedOrganizationInTable] =
    useState<number | string>(0);
  const [
    selectedOrganizationOptionInTable,
    setSelectedOrganizationOptionInTable,
  ] = useState(AllTeamStatisticOption.MAIN_TEAM);

  const [memberOptions, setMemberOptions] = useState<
    {
      id: number;
      fullName: string;
      color: string;
      avatarUrl: string;
    }[]
  >([]);

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
    datasets: CategoryLineChartDatasetInfo[];
  }>({
    labels: [],
    datasets: [],
  });
  const [totalDuration, setTotalDuration] = useState<string>(DEFAULT_TIME_TEXT);

  // Collapse statuses
  const [tagCollapseStatuses, setTagCollapseStatuses] = useState<
    {
      tagId: number | string;
      status: boolean;
      organizationId?: number | string;
    }[]
  >([]);

  // Sorting
  const [percentageSortingStatus, setPercentageSortingStatus] =
    useState<string>('');
  const [durationSortingStatus, setDurationSortingStatus] =
    useState<string>('');

  // Others
  const [isExtendData, setIsExtendData] = useState(true);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  const buildTableDetail = (
    tags: {
      tagId?: number;
      tagName?: string;
      percent: number;
      duration: string;
      organizationId?: number;
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
    tags.map((tag) => ({
      tagId: Number(tag.tagId),
      tagName: String(tag.tagName),
      tagPercent:
        tag.percent > STATISTIC_MAX_PERCENTAGE
          ? STATISTIC_MAX_PERCENTAGE
          : tag.percent,
      tagDuration: tag.duration,
      organizationId: tag.organizationId ?? 0,
      userList:
        orderingOptions?.user_ids && orderingOptions?.user_ids?.length > 0
          ? orderingOptions?.user_ids?.map((userInfo) => {
              const foundUser = tag.users?.find(
                (user) => user.user.id == userInfo.value,
              );
              if (foundUser) {
                return {
                  userId: foundUser.user.id,
                  userName: foundUser.user.fullName,
                  userAvatar: foundUser.user.avatar,
                  userAvatarColor: foundUser.user.avatarColor,
                  userDuration: foundUser.duration,
                  userPercent:
                    foundUser.percent > STATISTIC_MAX_PERCENTAGE
                      ? STATISTIC_MAX_PERCENTAGE
                      : foundUser.percent,
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
          : (listMemberTeam ?? [])?.map((userInfo) => {
              const foundUser = tag.users?.find(
                (user) => user.user.id == userInfo.id,
              );
              if (foundUser) {
                return {
                  userId: foundUser.user.id,
                  userName: foundUser.user.fullName,
                  userAvatar: foundUser.user.avatar,
                  userAvatarColor: foundUser.user.avatarColor,
                  userDuration: foundUser.duration,
                  userPercent:
                    foundUser.percent > STATISTIC_MAX_PERCENTAGE
                      ? STATISTIC_MAX_PERCENTAGE
                      : foundUser.percent,
                };
              }
              return {
                userId: Number(userInfo.id),
                userName: userInfo?.fullName,
                userAvatar: userInfo?.avatarUrl || '',
                userAvatarColor: userInfo?.color || '',
                userDuration: DEFAULT_TIME_TEXT,
                userPercent: 0,
              };
            }),
    }));

  const buildTableDetailWithAllTeamOption = (
    organizations: {
      color: string;
      duration: string;
      organizationId: string | number;
      organizationName: string;
      percent: number;
      users: {
        id: number;
        fullName: string;
        avatarColor: string;
        avatar: string | null;
        percent: number;
        totalDuration: string;
      }[];
    }[] = [],
  ) =>
    organizations.map((organization) => ({
      tagId:
        organization.organizationId == AllTeamStatisticOption.SUB_TEAMS
          ? AllTeamStatisticOption.SUB_TEAMS
          : organization.organizationId == selectedOrganizationSideBar?.value
            ? AllTeamStatisticOption.MAIN_TEAM
            : AllTeamStatisticOption.CALENDAR,
      tagName: organization.organizationName,
      tagPercent:
        organization.percent > STATISTIC_MAX_PERCENTAGE
          ? STATISTIC_MAX_PERCENTAGE
          : organization.percent,
      tagDuration: organization.duration,
      organizationId: organization.organizationId ?? 0,
      userList: organization.users.length
        ? organization.users.map((user) => {
            return {
              userId: user.id,
              userName: user.fullName,
              userAvatar: user.avatar,
              userAvatarColor: user.avatarColor,
              userDuration: user.totalDuration,
              userPercent:
                user.percent > STATISTIC_MAX_PERCENTAGE
                  ? STATISTIC_MAX_PERCENTAGE
                  : user.percent,
            };
          })
        : [],
    }));

  const handleTagSelection = (tagList: StatisticCategoryInfo[] | undefined) => {
    if (tagList?.length) {
      const [firstTag] = tagList;
      setSelectedTag({
        id: Number(firstTag.tagId),
        name: String(firstTag.tagName),
        organizationId: Number(firstTag.organizationId),
      });
      setSelectedOrganizationInTable(Number(firstTag.organizationId));
    } else {
      setSelectedTag(null);
    }
  };

  // Get user task durations
  const {
    statisticUserTaskDurationsList,
    isFetchingStatisticUserTaskDurationsList,
  } = useStatisticUserTaskDurations({
    filter: {
      fromDate: startDate ? `${formatDateToYMD(startDate)}` : '',
      endDate: endDate ? `${formatDateToYMD(endDate)}` : '',
      largeCategoryId:
        selectedLarge?.value == null
          ? NO_SETTING
          : (selectedLarge?.value as number),
      mediumCategoryId:
        selectedMedium?.value == null
          ? NO_SETTING
          : (selectedMedium?.value as number),
      smallCategoryId:
        selectedSmall?.value == null
          ? NO_SETTING
          : (selectedSmall?.value as number),
      statisticBy: `${lineChartViewBy?.value}`,
      selectedOrganization: selectedOrganizationInTable,
      tagIds: selectedTag
        ? [
            {
              value: selectedTag?.id,
              label: selectedTag?.name,
            },
          ]
        : [],
      organizationMemberId:
        selectedOrganization?.type === OrganizationStatisticType.CALENDAR
          ? String(selectedOrganizationSideBar?.value || '')
          : undefined,
      userIds:
        orderingOptions?.user_ids?.length == 0
          ? (listMemberTeam ?? []).map((user) => Number(user.id)).join(',')
          : selectedMembers?.filter(Boolean).join(','),
    },
    condition: [
      Boolean(
        selectedOrganization?.value != ALL_TEAM_STATISTIC &&
          lineChartTableData.length > 0 &&
          selectedTag?.id &&
          selectedOrganizationInTable,
      ),
    ],
  });

  // Get user task durations (all team case)
  const {
    statisticTeamDockAllTeamLineChartTaskDurationsList,
    isFetchingStatisticTeamDockAllTeamLineChartTaskDurationsList,
  } = useStatisticTeamDockAllTeamLineChartTaskDurations({
    filter: {
      fromDate: startDate ? `${formatDateToYMD(startDate)}` : '',
      endDate: endDate ? `${formatDateToYMD(endDate)}` : '',
      statisticBy: `${lineChartViewBy?.value}`,
      mainOrganizationId: String(selectedOrganizationSideBar?.value || ''),
      tagIds: orderingOptions?.tag_ids,
      userIds:
        orderingOptions?.user_ids?.length == 0
          ? (listMemberTeam ?? []).map((user) => Number(user.id)).join(',')
          : selectedMembers?.filter(Boolean).join(','),
      isTagPage: true,
      option: selectedOrganizationOptionInTable,
    },
    condition: [
      Boolean(
        selectedOrganization?.value == ALL_TEAM_STATISTIC &&
          selectedOrganizationSideBar,
      ),
    ],
  });

  // Get table info (statistic team categories)
  const { isFetchingStatisticTableInTeamTagLineChart } =
    useStatisticTableInTeamTagLineChart({
      filter: {
        fromDate: formatDateToYMD(startDate) || '',
        endDate: formatDateToYMD(`${endDate}`) || '',
        organizationId: String(selectedOrganization?.value || ''),
        largeCategoryId:
          selectedLarge?.value == null
            ? NO_SETTING
            : (selectedLarge?.value as number),
        mediumCategoryId:
          selectedMedium?.value == null
            ? NO_SETTING
            : (selectedMedium?.value as number),
        smallCategoryId:
          selectedSmall?.value == null
            ? NO_SETTING
            : (selectedSmall?.value as number),
        selectedTags: orderingOptions?.tag_ids || [],
        userIds:
          orderingOptions?.user_ids?.length == 0
            ? (listMemberTeam ?? []).map((user) => Number(user.id)).join(',')
            : selectedMembers?.filter(Boolean).join(','),
        organizationMemberId:
          selectedOrganization?.type === OrganizationStatisticType.CALENDAR
            ? String(selectedOrganizationSideBar?.value || '')
            : undefined,
      },
      condition: [
        Boolean(
          selectedOrganization?.value != ALL_TEAM_STATISTIC &&
            orderingOptions?.user_ids.length !=
              selectedMembers.filter((member) => Boolean(member)).length,
        ),
      ],
      onSuccess: (data) => {
        if (!data) return;

        let tableDetail: TagTableRowDetail[] = [];
        if (
          selectedOrganization?.value != '' &&
          selectedLarge?.value == '' &&
          selectedMedium?.value == '' &&
          selectedSmall?.value == ''
        ) {
          tableDetail = buildTableDetail(data.largeCategories);
          handleTagSelection(data.largeCategories);
        } else if (
          selectedOrganization?.value != '' &&
          selectedLarge?.value != '' &&
          selectedMedium?.value == '' &&
          selectedSmall?.value == ''
        ) {
          tableDetail = buildTableDetail(data.mediumCategories);
          handleTagSelection(data.mediumCategories);
        } else if (
          selectedOrganization?.value != '' &&
          selectedLarge?.value != '' &&
          selectedMedium?.value != '' &&
          selectedSmall?.value == ''
        ) {
          tableDetail = buildTableDetail(data.smallCategories);
          handleTagSelection(data.smallCategories);
        } else if (
          selectedOrganization?.value != '' &&
          selectedLarge?.value != '' &&
          selectedMedium?.value != '' &&
          selectedSmall?.value != ''
        ) {
          tableDetail = buildTableDetail(data.category);
          handleTagSelection(data.category);
        }

        setTagCollapseStatuses(
          tableDetail.map((tag) => {
            return {
              tagId: tag.tagId,
              status: false,
              organizationId: tag.organizationId,
            };
          }),
        );

        setLineChartTableData(tableDetail);

        // Calculate total duration
        const totalDurationList = (tableDetail || [])
          .map((item) => item.tagDuration)
          .filter(Boolean); // remove null, undefined, ''

        setTotalDuration(totalDurationsForStatistic(totalDurationList));
      },
    });

  useEffect(() => {
    if (
      selectedOrganization?.value != ALL_TEAM_STATISTIC &&
      orderingOptions?.user_ids.length ==
        selectedMembers.filter((member) => Boolean(member)).length &&
      statisticTagsListTeam
    ) {
      let tableDetail: TagTableRowDetail[] = [];
      if (
        selectedOrganization?.value != '' &&
        selectedLarge?.value == '' &&
        selectedMedium?.value == '' &&
        selectedSmall?.value == ''
      ) {
        tableDetail = buildTableDetail(statisticTagsListTeam.largeCategories);
        handleTagSelection(statisticTagsListTeam.largeCategories);
      } else if (
        selectedOrganization?.value != '' &&
        selectedLarge?.value != '' &&
        selectedMedium?.value == '' &&
        selectedSmall?.value == ''
      ) {
        tableDetail = buildTableDetail(statisticTagsListTeam.mediumCategories);
        handleTagSelection(statisticTagsListTeam.mediumCategories);
      } else if (
        selectedOrganization?.value != '' &&
        selectedLarge?.value != '' &&
        selectedMedium?.value != '' &&
        selectedSmall?.value == ''
      ) {
        tableDetail = buildTableDetail(statisticTagsListTeam.smallCategories);
        handleTagSelection(statisticTagsListTeam.smallCategories);
      } else if (
        selectedOrganization?.value != '' &&
        selectedLarge?.value != '' &&
        selectedMedium?.value != '' &&
        selectedSmall?.value != ''
      ) {
        tableDetail = buildTableDetail(statisticTagsListTeam.category);
        handleTagSelection(statisticTagsListTeam.category);
      }

      setTagCollapseStatuses(
        tableDetail.map((tag) => {
          return {
            tagId: tag.tagId,
            status: false,
            organizationId: tag.organizationId,
          };
        }),
      );

      setLineChartTableData(tableDetail);

      // Calculate total duration
      const totalDurationList = (tableDetail || [])
        .map((item) => item.tagDuration)
        .filter(Boolean); // remove null, undefined, ''

      setTotalDuration(totalDurationsForStatistic(totalDurationList));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    statisticTagsListTeam,
    selectedLarge,
    selectedMedium,
    selectedOrganization,
    selectedMembers,
    orderingOptions?.user_ids.length,
  ]);

  // Get initial member options
  useEffect(() => {
    if (allLabelUser.length > 0) {
      const allMembers = [
        {
          id: 0,
          fullName: EVERYONE_OPTION_LABEL,
          avatarUrl: '',
          color: '#228CDB',
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

    if (!tooltipEl || !tooltipModel) return;
    if (selectedOrganization?.value != ALL_TEAM_STATISTIC && !selectedTag)
      return;

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
        selectedOptionName={
          selectedOrganization?.value != ALL_TEAM_STATISTIC
            ? selectedTag?.name || ''
            : selectedOrganizationOptionInTable ==
                AllTeamStatisticOption.MAIN_TEAM
              ? selectedOrganizationSideBar?.label || ''
              : selectedOrganizationOptionInTable
        }
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
            family: 'Noto Sans JP, sans-serif',
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
            family: 'Noto Sans JP, sans-serif',
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
      selectedOrganization?.value != ALL_TEAM_STATISTIC &&
      statisticUserTaskDurationsList &&
      statisticUserTaskDurationsList.length > 0
    ) {
      const loadImages = async () => {
        const imagePromises = statisticUserTaskDurationsList.map(
          (userTaskDuration: StatisticsUserTaskDuration) =>
            createLineChartAvatarImage(
              userTaskDuration?.user || {
                avatar: null,
                avatarColor: getRandomColor(),
                id: 0,
                fullName: '',
              },
            ),
        );

        const loadedImages = await Promise.all(imagePromises);
        setImages(loadedImages);
      };

      loadImages();
    } else {
      setImages([]);
    }
  }, [statisticUserTaskDurationsList, selectedOrganization?.value]);

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
      selectedOrganization?.value != ALL_TEAM_STATISTIC &&
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
        if (userTaskDuration?.user) {
          legendList.push({
            color: userTaskDuration?.user?.avatarColor || getRandomColor(),
            name: userTaskDuration?.user?.fullName,
          });
          datasets.push({
            label: userTaskDuration?.user?.fullName,
            data: userTaskDuration.durations.flatMap((duration, index) => [
              {
                x: duration.startDate,
                y: duration.duration
                  ? convertTimeToDecimal(duration.duration)
                  : 0,
                endDate: duration.endDate,
                avatarColor: userTaskDuration?.user?.avatarColor,
                avatar: userTaskDuration?.user?.avatar || '',
                userId: userTaskDuration?.user?.id,
                label: userTaskDuration?.user?.fullName,
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
                      avatarColor: userTaskDuration?.user?.avatarColor,
                      avatar: userTaskDuration?.user?.avatar || '',
                      userId: userTaskDuration?.user?.id,
                      label: userTaskDuration?.user?.fullName,
                    },
                  ]
                : []),
            ]),
            borderColor:
              userTaskDuration?.user?.avatarColor || getRandomColor(),
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
        }
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
  }, [statisticUserTaskDurationsList, selectedOrganization?.value]);

  useEffect(() => {
    if (
      selectedOrganization?.value == ALL_TEAM_STATISTIC &&
      statisticTeamDockAllTeamLineChartTaskDurationsList
    ) {
      let labelList: string[] = [];
      let legendList: { name: string; color: string }[] = [];
      let tableDetail = [];
      const totalDurationList: string[] = [];

      // Map: organizationId -> dataset info
      const datasetMap = new Map<
        string | number,
        CategoryLineChartDatasetInfo
      >();

      const normalizeDataObject =
        normalizeDurationUsersWithTeamDockStatisticAllTeam(
          statisticTeamDockAllTeamLineChartTaskDurationsList,
          selectedOrganizationOptionInTable,
          selectedOrganizationSideBar?.value as number,
        );
      if (normalizeDataObject.durations.length) {
        const durationList = normalizeDataObject.durations.map((duration) => ({
          startDate: duration.startDate,
          endDate: duration.endDate,
        }));
        labelList = extractDateLabelsListFromTaskDuration(durationList);
        normalizeDataObject.durations.forEach((durationDetail, index) => {
          durationDetail.data.length &&
            durationDetail.data[0].users.forEach((user) => {
              const existing = datasetMap.get(`${user.id}-${user.fullName}`);

              if (existing) {
                existing.data[index] = {
                  x: durationDetail.startDate,
                  y: user.totalDuration
                    ? convertTimeToDecimal(user.totalDuration)
                    : 0,
                  endDate: durationDetail.endDate,
                  avatarColor: user?.avatarColor,
                  avatar: user?.avatar || '',
                  userId: user?.id,
                  label: user.fullName,
                };
                if (
                  index === normalizeDataObject.durations.length - 1 &&
                  String(normalizeDataObject.durations.at(-1)?.endDate) !=
                    String(normalizeDataObject.durations.at(-1)?.startDate)
                ) {
                  existing.data[index + 1] = {
                    x: durationDetail.endDate,
                    y: user.totalDuration
                      ? convertTimeToDecimal(user.totalDuration)
                      : 0,
                    endDate: durationDetail.endDate,
                    avatarColor: user?.avatarColor,
                    avatar: user?.avatar || '',
                    userId: user?.id,
                    label: user.fullName,
                  };
                }
              } else {
                // Initialize new dataset with placeholders
                const dataArray = Array(
                  normalizeDataObject.durations.length,
                ).fill(0);
                dataArray[index] = {
                  x: durationDetail.startDate,
                  y: user.totalDuration
                    ? convertTimeToDecimal(user.totalDuration)
                    : 0,
                  endDate: durationDetail.endDate,
                  avatarColor: user?.avatarColor,
                  avatar: user?.avatar || '',
                  userId: user?.id,
                  label: user.fullName,
                };
                datasetMap.set(`${user.id}-${user.fullName}`, {
                  label: user.fullName,
                  data: dataArray,
                  borderColor: user.avatarColor || getRandomColor(),
                  backgroundColor: 'transparent',
                  fill: true,
                  tension: 0,
                  pointRadius: 4,
                  pointBorderColor: 'transparent',
                  pointHoverRadius: 6,
                  pointHoverBackgroundColor:
                    user.avatarColor || getRandomColor(),
                  pointHoverBorderColor: 'transparent',
                  pointHoverBorderWidth: 2,
                });
              }
            });
        });

        const loadImages = async () => {
          const imagePromises =
            normalizeDataObject.durations[0].data[0].users.map((user) =>
              createLineChartAvatarImage(
                user || {
                  avatar: null,
                  avatarColor: getRandomColor(),
                  id: 0,
                  fullName: '',
                },
              ),
            );

          const loadedImages = await Promise.all(imagePromises);
          setImages(loadedImages);
        };

        loadImages();

        setLineChartData({
          labels: labelList,
          datasets: Array.from(datasetMap.values()),
        });
      } else {
        setLineChartData({
          labels: [],
          datasets: [],
        });
        setImages([]);
      }

      if (normalizeDataObject.data.length) {
        tableDetail = buildTableDetailWithAllTeamOption(
          normalizeDataObject.data,
        );
        legendList =
          tableDetail
            ?.find((org) => org.tagId == selectedOrganizationOptionInTable)
            ?.userList.map((user) => {
              return {
                color: user.userAvatarColor,
                name: user.userName,
              };
            }) || [];
        tableDetail.forEach((detail) => {
          totalDurationList.push(detail.tagDuration);
        });
        setTotalDuration(totalDurationsForStatistic(totalDurationList));
        setLegendList(legendList);
        setTagCollapseStatuses(
          normalizeDataObject.data.map((organization) => {
            return {
              tagId:
                organization.organizationId ==
                selectedOrganizationSideBar?.value
                  ? AllTeamStatisticOption.MAIN_TEAM
                  : organization.organizationId ==
                      AllTeamStatisticOption.SUB_TEAMS
                    ? AllTeamStatisticOption.SUB_TEAMS
                    : AllTeamStatisticOption.CALENDAR,
              status: false,
            };
          }),
        );
        setLineChartTableData(tableDetail);
      } else {
        setLineChartTableData([]);
        setLegendList([]);
        setTotalDuration(DEFAULT_TIME_TEXT);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    statisticTeamDockAllTeamLineChartTaskDurationsList,
    selectedOrganizationSideBar?.value,
    selectedOrganization?.value,
    selectedOrganizationOptionInTable,
  ]);

  // Sort by percent difference
  const sortByPercentDifference = (
    data: TagTableRowDetail[],
    sortingType: string,
  ) => {
    const sortedArr = data.slice().sort((rowA, rowB) => {
      const rowAPercentage = Number(rowA.tagPercent || 0);
      const rowBPercentage = Number(rowB.tagPercent || 0);

      return sortingType == SortingType.ASC
        ? rowAPercentage - rowBPercentage
        : rowBPercentage - rowAPercentage;
    });
    setLineChartTableData(sortedArr);
  };

  // Sort by duration difference
  const sortByDurationDifference = (
    data: TagTableRowDetail[],
    sortingType: string,
  ) => {
    const sortedArr = data.slice().sort((rowA, rowB) => {
      const rowADuration = convertDurationToTotalMinutes(
        rowA.tagDuration || DEFAULT_TIME_TEXT,
      );
      const rowBDuration = convertDurationToTotalMinutes(
        rowB.tagDuration || DEFAULT_TIME_TEXT,
      );

      return sortingType == SortingType.ASC
        ? rowADuration - rowBDuration
        : rowBDuration - rowADuration;
    });
    setLineChartTableData(sortedArr);
  };

  // Columns definition
  const columns: ColumnDef<TagTableRowDetail>[] = [
    {
      accessorKey: 'tagName',
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
          tagCollapseStatuses.find((tagCollapseStatus) =>
            selectedOrganization?.value != ALL_TEAM_STATISTIC
              ? tagCollapseStatus.tagId == info.row.original.tagId &&
                info.row.original.organizationId ==
                  tagCollapseStatus?.organizationId
              : tagCollapseStatus.tagId == info.row.original.tagId,
          )?.status || false;

        return (
          <div className="flex items-start px-[18px]">
            <RadioButton
              name="lineChartTagName"
              isChecked={
                selectedOrganization?.value != ALL_TEAM_STATISTIC
                  ? info.row.original.tagId == selectedTag?.id &&
                    info.row.original.organizationId ==
                      selectedTag?.organizationId
                  : info.row.original.tagId == selectedOrganizationOptionInTable
              }
              onChange={(e: any) => {
                if (e) {
                  setSelectedTag({
                    id: info.row.original.tagId,
                    name: info.row.original.tagName,
                    organizationId: info.row.original.organizationId,
                  });
                  setSelectedOrganizationInTable(
                    info.row.original.organizationId,
                  );
                  if (selectedOrganization?.value == ALL_TEAM_STATISTIC) {
                    setSelectedOrganizationOptionInTable(
                      info.row.original.tagId as AllTeamStatisticOption,
                    );
                  }
                }
              }}
            />
            <div className="w-full">
              <div
                className={`flex justify-between items-center w-full ${
                  collapseStatus &&
                  info.row.original?.userList?.filter((user) =>
                    orderingOptions?.user_ids &&
                    orderingOptions?.user_ids?.length > 0
                      ? selectedMembers.includes(user.userId)
                      : (listMemberTeam ?? [])
                          .map((user) => Number(user.id))
                          .includes(user.userId),
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
                      setTagCollapseStatuses((prev) =>
                        prev.map((item) => {
                          const sameTag =
                            item.tagId === info.row.original.tagId;
                          const sameOrg =
                            selectedOrganization?.value !== ALL_TEAM_STATISTIC
                              ? item.organizationId ===
                                info.row.original.organizationId
                              : true;

                          if (sameTag && sameOrg) {
                            return { ...item, status: !item.status };
                          }

                          return item;
                        }),
                      );
                    }}
                  />
                </div>
              </div>
              {collapseStatus &&
                info.row.original?.userList &&
                info.row.original?.userList.length > 0 && (
                  <div className="flex flex-col">
                    {info.row.original?.userList
                      ?.filter((user) =>
                        orderingOptions?.user_ids &&
                        orderingOptions?.user_ids?.length > 0
                          ? selectedMembers.includes(user.userId)
                          : (listMemberTeam ?? [])
                              .map((user) => Number(user.id))
                              .includes(user.userId),
                      )
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
      accessorKey: 'tagDuration',
      size: 50,
      header: () => {
        return (
          <div
            className="flex gap-6 items-center justify-center"
            onClick={() => {
              if (
                !durationSortingStatus ||
                durationSortingStatus == SortingType.DESC
              ) {
                setDurationSortingStatus(SortingType.ASC);
                sortByDurationDifference(lineChartTableData, SortingType.ASC);
              } else {
                setDurationSortingStatus(SortingType.DESC);
                sortByDurationDifference(lineChartTableData, SortingType.DESC);
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
          tagCollapseStatuses.find((tagCollapseStatus) =>
            selectedOrganization?.value != ALL_TEAM_STATISTIC
              ? tagCollapseStatus.tagId == info.row.original.tagId &&
                info.row.original.organizationId ==
                  tagCollapseStatus?.organizationId
              : tagCollapseStatus.tagId == info.row.original.tagId,
          )?.status || false;

        return (
          <div className="flex flex-col font-medium text-[14px] text-black px-[18px]">
            <div
              className={`flex justify-center ${
                collapseStatus &&
                info.row.original?.userList?.filter((user) =>
                  orderingOptions?.user_ids &&
                  orderingOptions?.user_ids?.length > 0
                    ? selectedMembers.includes(user.userId)
                    : (listMemberTeam ?? [])
                        .map((user) => Number(user.id))
                        .includes(user.userId),
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
                    ?.filter((user) =>
                      orderingOptions?.user_ids &&
                      orderingOptions?.user_ids?.length > 0
                        ? selectedMembers.includes(user.userId)
                        : (listMemberTeam ?? [])
                            .map((user) => Number(user.id))
                            .includes(user.userId),
                    )
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
      accessorKey: 'tagPercent',
      size: 30,
      header: () => {
        return (
          <div
            className="flex gap-2 items-center justify-center cursor-pointer"
            onClick={() => {
              if (
                !percentageSortingStatus ||
                percentageSortingStatus == SortingType.DESC
              ) {
                setPercentageSortingStatus(SortingType.ASC);
                sortByPercentDifference(lineChartTableData, SortingType.ASC);
              } else {
                setPercentageSortingStatus(SortingType.DESC);
                sortByPercentDifference(lineChartTableData, SortingType.DESC);
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
          tagCollapseStatuses.find((tagCollapseStatus) =>
            selectedOrganization?.value != ALL_TEAM_STATISTIC
              ? tagCollapseStatus.tagId == info.row.original.tagId &&
                info.row.original.organizationId ==
                  tagCollapseStatus?.organizationId
              : tagCollapseStatus.tagId == info.row.original.tagId,
          )?.status || false;

        return (
          <div className="flex flex-col font-medium text-[14px] text-black px-[18px]">
            <p
              className={`flex justify-center ${
                collapseStatus &&
                info.row.original?.userList?.filter((user) =>
                  orderingOptions?.user_ids &&
                  orderingOptions?.user_ids?.length > 0
                    ? selectedMembers.includes(user.userId)
                    : (listMemberTeam ?? [])
                        .map((user) => Number(user.id))
                        .includes(user.userId),
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
                    ?.filter((user) =>
                      orderingOptions?.user_ids &&
                      orderingOptions?.user_ids?.length > 0
                        ? selectedMembers.includes(user.userId)
                        : (listMemberTeam ?? [])
                            .map((user) => Number(user.id))
                            .includes(user.userId),
                    )
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
    data: lineChartTableData,
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
      className="p-[30px] bg-[#F8FAFC] mt-5 rounded-[30px]">
      {/* Header & sort */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-x-5">
          <div className="flex items-center gap-[10px] ">
            <ImageRound
              className={`w-fit h-fit  hover:cursor-pointer`}
              name="statistic line chart icon"
              src={`/icons/statistic-line-chart.svg`}
            />
            <span className="text-black w-[210px] flex-shrink-0  font-semibold text-[18px]">
              期間における時間の推移
            </span>
          </div>
        </div>
        <ImageRound
          src="/icons/extend-calendar.svg"
          name="Extend calendar"
          className={`!w-[14px] !h-[14px] hover:cursor-pointer ${
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
            {/* List tags  */}
            <div>
              <div className="flex justify-between w-full mb-[30px] px-[30px]">
                {/* Filter tag */}
                <FilterTagTeam />
              </div>
            </div>
            <div className="flex justify-between items-end px-[30px] text-sm font-medium">
              {/* Column Chart 1 */}
              <div className="w-[220px] flex flex-col items-center">
                <div
                  className={`${selectedOrganization?.value != '' && selectedLarge?.value == '' && selectedMedium?.value == '' && selectedSmall?.value == '' ? 'text-white bg-[#3CABF3]' : 'text-[#77858F] bg-[#fff] border-[#77858F] border-[1px]'} rounded-[100px] w-[112px] h-[34px] text-sm flex justify-center items-center`}>
                  チーム
                </div>
                <div className="mt-4 w-full">
                  <Dropdown
                    label="チーム選択"
                    placeholder="-"
                    disabled={isHasLoading}
                    placeholderClass="!text-black text-sm font-normal"
                    className="!h-[34px] !rounded-md !border text-sm font-normal !py-0 !border-[#77858F] "
                    labelTextClass="!text-[#77858F] !text-xs !font-medium"
                    classNameOption="!text-sm"
                    options={listOptionsOrganization}
                    selectedOption={selectedOrganization || undefined}
                    onChange={(data) => {
                      setSelectedMembers([]);
                      setLineChartTableData([]);
                      setSelectedTag(null);
                      handleSelectOrganization(data);
                    }}
                  />
                </div>
              </div>
              {selectedLarge?.value != '' ? (
                <div className="w-[18px]">
                  <ImageRound
                    className={`w-fit h-fit`}
                    src="/icons/drawer-blue.svg"
                    name="icon chevron right"
                  />
                </div>
              ) : (
                <div className="w-[18px]"></div>
              )}

              {/* Column Chart 2 */}
              <div className="w-[220px] flex flex-col items-center">
                <div
                  className={`${selectedOrganization?.value != '' && selectedLarge?.value != '' && selectedMedium?.value == '' && selectedSmall?.value == '' ? 'text-white bg-[#3CABF3]' : 'text-[#77858F] bg-[#fff] border-[#77858F] border-[1px]'} rounded-[100px] w-[112px] h-[34px] text-sm flex justify-center items-center`}>
                  大カテゴリー
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
                      setLineChartTableData([]);
                      setSelectedTag(null);
                      handleSelectLarge(data);
                    }}
                    disabled={selectedOrganization?.value == '' || isHasLoading}
                  />
                </div>
              </div>
              {selectedMedium?.value != '' ? (
                <div className="w-[18px]">
                  <ImageRound
                    className={`w-fit h-fit`}
                    src="/icons/drawer-blue.svg"
                    name="icon chevron right"
                  />
                </div>
              ) : (
                <div className="w-[18px]"></div>
              )}
              {/* Column Chart 3 */}
              <div className="w-[220px] flex flex-col items-center">
                <div
                  className={`${selectedOrganization?.value != '' && selectedLarge?.value != '' && selectedMedium?.value != '' && selectedSmall?.value == '' ? 'text-white bg-[#3CABF3]' : 'text-[#77858F] bg-[#fff] border-[#77858F] border-[1px]'} rounded-[100px] w-[112px] h-[34px] text-sm flex justify-center items-center`}>
                  中カテゴリー
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
                      setLineChartTableData([]);
                      setSelectedTag(null);
                      handleSelectMedium(data);
                    }}
                    disabled={
                      selectedLarge?.value == '' ||
                      isHasLoading ||
                      isDisableCalendar
                    }
                  />
                </div>
              </div>
              {selectedSmall?.value != '' ? (
                <div className="w-[18px]">
                  <ImageRound
                    className={`w-fit h-fit`}
                    src="/icons/drawer-blue.svg"
                    name="icon chevron right"
                  />
                </div>
              ) : (
                <div className="w-[18px]"></div>
              )}
              {/* Column Chart 4 */}
              <div className="w-[220px] flex flex-col items-center">
                <div
                  className={`${selectedOrganization?.value != '' && selectedLarge?.value != '' && selectedMedium?.value != '' && selectedSmall?.value != '' ? 'text-white bg-[#3CABF3]' : 'text-[#77858F] bg-[#fff] border-[#77858F] border-[1px]'} rounded-[100px] w-[112px] h-[34px] text-sm flex justify-center items-center`}>
                  小カテゴリー
                </div>
                <div className="mt-4 w-full">
                  <Dropdown
                    label="小カテゴリー選択"
                    placeholder="-"
                    placeholderClass="!text-black text-sm font-normal"
                    className="!h-[34px] !rounded-md text-sm font-normal !py-0 !border !border-[#77858F]"
                    labelTextClass="!text-[#77858F] !text-xs !font-medium"
                    classNameOption="!text-sm"
                    options={smallOptions}
                    selectedOption={selectedSmall || undefined}
                    onChange={(data) => {
                      setLineChartTableData([]);
                      setSelectedTag(null);
                      handleSelectSmall(data);
                    }}
                    disabled={
                      selectedMedium?.value == '' ||
                      isHasLoading ||
                      isDisableCalendar
                    }
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
                    setLineChartTableData([]);
                    setSelectedTag(null);
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
                        disable={
                          isFetchingStatisticTableInTeamTagLineChart ||
                          isFetchingStatisticUserTaskDurationsList
                        }
                        onChange={(state) => {
                          setLineChartTableData([]);
                          setSelectedTag(null);
                          let updatedMembers = [...selectedMembers];
                          if (state) {
                            if (member.id) {
                              const foundMember = selectedMembers.find(
                                (memberId) => memberId == member.id,
                              );
                              if (!foundMember) {
                                updatedMembers = [...updatedMembers, member.id];
                              }
                            } else {
                              updatedMembers = memberOptions.map(
                                (member) => member.id,
                              );
                            }
                          } else {
                            if (member.id) {
                              const foundMember = selectedMembers.find(
                                (memberId) => memberId == member.id,
                              );
                              if (foundMember) {
                                updatedMembers = [...selectedMembers].filter(
                                  (memberId) =>
                                    memberId && memberId != member.id,
                                );
                              }
                            } else {
                              updatedMembers = [];
                            }
                          }
                          setSelectedMembers(updatedMembers);
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

          {(isFetchingStatisticUserTaskDurationsList &&
            selectedOrganization?.value != ALL_TEAM_STATISTIC) ||
          (isFetchingStatisticTeamDockAllTeamLineChartTaskDurationsList &&
            selectedOrganization?.value == ALL_TEAM_STATISTIC) ? (
            <RowSkeleton
              numberOfRows={1}
              className={`!h-[395px] w-[calc(100%_-_60px)] mx-auto`}
            />
          ) : (
            <div
              style={{ position: 'relative' }}
              className={`h-[380px] ${expanded && 'w-[calc(100%_-_10px)]'}`}>
              <Line
                ref={chartRef}
                data={{
                  datasets: lineChartData?.datasets || [],
                  labels: lineChartData?.labels.length
                    ? lineChartData?.labels
                    : getStatisticMilestones(
                        `${formatDateToYMD(startDate)}`,
                        `${formatDateToYMD(endDate || '')}`,
                        lineChartViewBy?.value as StatisticViewOptions,
                      ),
                }}
                options={options}
              />
              <div
                ref={tooltipRef}
                style={{ position: 'absolute', opacity: 0 }}
              />
            </div>
          )}

          <div className="px-[30px]">
            {(!isFetchingStatisticUserTaskDurationsList &&
              selectedOrganization?.value != ALL_TEAM_STATISTIC) ||
            (!isFetchingStatisticTeamDockAllTeamLineChartTaskDurationsList &&
              selectedOrganization?.value == ALL_TEAM_STATISTIC) ? (
              <div className="flex gap-8 items-center justify-end flex-wrap">
                {legendList.map((label, index) => {
                  return (
                    <div key={index} className="flex gap-1 items-center">
                      <div
                        className="w-6 h-1"
                        style={{ backgroundColor: label.color }}></div>
                      <p className="font-medium text-[#77858F] text-xs truncate max-w-[200px]">
                        {label.name}
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <></>
            )}

            {(isFetchingStatisticUserTaskDurationsList &&
              selectedOrganization?.value != ALL_TEAM_STATISTIC) ||
            (isFetchingStatisticTeamDockAllTeamLineChartTaskDurationsList &&
              selectedOrganization?.value == ALL_TEAM_STATISTIC) ? (
              <StatisticLineChartTableSkeleton />
            ) : (
              <Table
                className={`border border-[#D2DBE1] !ring-0 bg-white !pt-0 py-0 mt-5 rounded-[10px] ${lineChartTableData.length && 'max-h-[500px] overflow-y-auto'}`}>
                <thead>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr
                      key={headerGroup.id}
                      className="sticky top-0 z-10 text-[#77858F] bg-[#F8FAFC] font-medium text-xs text-left">
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
export default LineChartByTeamTags;
