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
import RadioButton from '@components/common/RadioButton';
import CustomUserAvatar from '@components/common/AvatarIcon/CustomUserAvatar';
import CustomStatisticUserCheckbox from '@components/common/Checkbox/CustomStatisticUserCheckbox';
import { TeamDockCompareLineChartTooltip } from '@components/tooltip/TeamDockCompareLineChartTooltip';
import ActionFilterTeamTagStatistic from '@components/modals/ActionFilterTeamTagStatistic';
import StatisticLineChartTableSkeleton from '@components/common/SkeletonLoading/StatisticLineChartTableSkeleton';

import { GlobalStateContext } from '@providers/GlobalStateProvider';
import { StatisticTeamTagsStateContext } from '@providers/StatisticTeamProviderTag';

import { OptionDropdownType } from '@interfaces/common';
import {
  CategoryLineChartDatasetInfo,
  TagTableRowDetailWithType,
  TeamDockAllTeamTableRowDetail,
  TeamDockMergedTable,
} from '@interfaces/statistic';
import { TooltipDiv } from '@interfaces/tooltip';

import {
  AllTeamStatisticOption,
  OrganizationStatisticType,
  SortingType,
  StatisticChartType,
  StatisticViewOptions,
} from '@constants/enums';
import {
  ALL_TEAM_STATISTIC,
  DEFAULT_TIME_TEXT,
  EVERYONE_OPTION_LABEL,
  STATISTIC_CHART_VIEW_OPTIONS,
} from '@constants';

import {
  convertDurationToTotalMinutes,
  convertTimeToDecimal,
  convertToStatisticJapaneseLabels,
  extractDateLabelsListFromTaskDuration,
  formatDateToYMD,
  formatShowStatisticTask,
  generateShownLineChartDateLabels,
  getCategoryFormattedDate,
  getJapaneseDayName,
  subtractDurations,
  totalDurationsForStatistic,
} from '@utils/date';
import {
  createLineChartAvatarImage,
  getCompareLineChartEnableViews,
  getRandomColor,
  getSafeTooltipLeft,
  getStatisticMilestones,
  mergeTeamDockLineChartTableItems,
  normalizeDurationUsersWithTeamDockStatisticAllTeam,
  toRGBA,
} from '@utils';

import useStatisticUserTaskDurations from '@hooks/useStatisticUserTaskDurations';
import useStatisticUserTaskDurationsCompare from '@hooks/useStatisticUserTaskDurationsCompare';
import useStatisticTableInTeamTagLineChartCompare from '@hooks/useStatisticTableInTeamTagLineChartCompare';
import useStatisticTableInTeamTagLineChart from '@hooks/useStatisticTableInTeamTagLineChart';

import FilterTagTeam from '../filter/FilterTagTeam';
import useStatisticTeamDockAllTeamLineChartTaskDurationsCompare from '@hooks/useStatisticTeamDockAllTeamLineChartTaskDurationsCompare';
import useStatisticTeamDockAllTeamLineChartTaskDurations from '@hooks/useStatisticTeamDockAllTeamLineChartTaskDurations';

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
  startDateCompare: Date;
  endDateCompare: Date | null;
  removeUser: (selected: OptionDropdownType) => void;
  handleSelectOrganization: (data: OptionDropdownType) => void;
  handleSelectLarge: (data: OptionDropdownType) => void;
  handleSelectMedium: (data: OptionDropdownType) => void;
  handleSelectSmall: (data: OptionDropdownType) => void;
};

const LineChartByTeamTagsCompare = ({
  startDate,
  endDate,
  startDateCompare,
  endDateCompare,
  removeUser,
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
    selectedTags,
    firstThreeUser,
    allLabelUser,
    remainingCountUser,
    listMemberTeam,
    lineChartViewBy,
    orderingOptions,
    mergedTableData,
    setLineChartViewBy,
    setMergedTableData,
  } = useContext(StatisticTeamTagsStateContext);
  const { expanded, selectedOrganization: selectedOrganizationSideBar } =
    useContext(GlobalStateContext);
  // Selected members and tag
  const [selectedMembers, setSelectedMembers] = useState<number[]>([]);
  const [selectedTag, setSelectedTag] = useState<{
    id?: string | number;
    name?: string;
    organizationId?: string | number;
  } | null>(null);
  const [selectedOrganizationInTable, setSelectedOrganizationInTable] =
    useState<string | number>(0);
  const [
    selectedOrganizationOptionInTable,
    setSelectedOrganizationOptionInTable,
  ] = useState(AllTeamStatisticOption.MAIN_TEAM);

  const [isOpenModalFilter, setIsOpenModalFilter] = useState(false);
  const [memberOptions, setMemberOptions] = useState<
    {
      id: number;
      fullName: string;
      color: string;
      avatarUrl: string;
    }[]
  >([]);
  const [hasFetchedStandardCategories, setHasFetchedStandardCategories] =
    useState(false);
  const [hasFetchedCompareCategories, setHasFetchedCompareCategories] =
    useState(false);

  // Table data
  const [standardTableData, setStandardTableData] = useState<
    TagTableRowDetailWithType[]
  >([]);
  const [compareTableData, setCompareTableData] = useState<
    TagTableRowDetailWithType[]
  >([]);

  // Chart
  const chartRef = useRef<any>(null);
  const [images, setImages] = useState<CanvasImageSource[]>([]);
  const [standardLegendList, setStandardLegendList] = useState<
    {
      color: string;
      name: string;
    }[]
  >([]);
  const [compareLegendList, setCompareLegendList] = useState<
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
  const [standardDateLabels, setStandardDateLabels] = useState<string[]>([]);
  const [compareDateLabels, setCompareDateLabels] = useState<string[]>([]);
  const [totalStandardDuration, setTotalStandardDuration] =
    useState<string>(DEFAULT_TIME_TEXT);
  const [totalCompareDuration, setTotalCompareDuration] =
    useState<string>(DEFAULT_TIME_TEXT);

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
    type: StatisticChartType,
  ) =>
    tags.map((tag) => ({
      tagId: Number(tag.tagId),
      tagName: String(tag.tagName),
      tagPercent: tag.percent,
      tagDuration: tag.duration,
      organizationId: tag.organizationId ?? 0,
      type,
      userList:
        allLabelUser.length > 0
          ? allLabelUser.map((userInfo) => {
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

  const handleTagSelection = (tagList: TeamDockMergedTable[] | undefined) => {
    if (tagList?.length) {
      const [firstTag] = tagList;
      setSelectedTag({
        id: firstTag.tagId,
        name: firstTag.tagName,
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
      largeCategoryId: selectedLarge?.value,
      mediumCategoryId: selectedMedium?.value,
      smallCategoryId: selectedSmall?.value,
      statisticBy: `${lineChartViewBy?.value}`,
      selectedOrganization: selectedOrganizationInTable,
      tagIds: selectedTag
        ? [
            {
              value: selectedTag?.id || '',
              label: selectedTag?.name || '',
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
          mergedTableData.length > 0 &&
          selectedTag?.id &&
          selectedOrganizationInTable,
      ),
    ],
  });

  // Get user task durations (compared)
  const {
    statisticUserTaskDurationsCompareList,
    isFetchingStatisticUserTaskDurationsCompareList,
  } = useStatisticUserTaskDurationsCompare({
    filter: {
      fromDate: startDateCompare ? `${formatDateToYMD(startDateCompare)}` : '',
      endDate: endDateCompare ? `${formatDateToYMD(endDateCompare)}` : '',
      largeCategoryId: selectedLarge?.value,
      mediumCategoryId: selectedMedium?.value,
      smallCategoryId: selectedSmall?.value,
      statisticBy: `${lineChartViewBy?.value}`,
      selectedOrganization: selectedOrganizationInTable,
      tagIds: selectedTag
        ? [
            {
              value: selectedTag?.id || '',
              label: selectedTag?.name || '',
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
          mergedTableData.length > 0 &&
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
      tagIds: selectedTags,
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

  // Get compared user task durations (all team case)
  const {
    statisticTeamDockAllTeamLineChartTaskDurationsListCompare,
    isFetchingStatisticTeamDockAllTeamLineChartTaskDurationsListCompare,
  } = useStatisticTeamDockAllTeamLineChartTaskDurationsCompare({
    filter: {
      fromDate: startDateCompare ? `${formatDateToYMD(startDateCompare)}` : '',
      endDate: endDateCompare ? `${formatDateToYMD(endDateCompare)}` : '',
      statisticBy: `${lineChartViewBy?.value}`,
      mainOrganizationId: String(selectedOrganizationSideBar?.value || ''),
      tagIds: selectedTags,
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

  const mergeCategories = (
    data: TagTableRowDetailWithType[],
  ): TeamDockMergedTable[] => {
    const grouped: Record<string, TeamDockMergedTable> = {};

    data.forEach((item) => {
      const key = `${item.tagId}::${item.organizationId}`;

      if (!grouped[key]) {
        grouped[key] = {
          tagId: item.tagId,
          tagName: item.tagName,
          organizationId: item.organizationId,
          userList: [],
        };
      }

      // Set standard or compare info for the tag
      const tagInfo = {
        duration: item.tagDuration,
        percent: item.tagPercent,
      };

      if (item.type === StatisticChartType.STANDARD) {
        grouped[key].standardInfo = tagInfo;
      } else if (item.type === StatisticChartType.COMPARE) {
        grouped[key].compareInfo = tagInfo;
      }

      // Merge userList
      item.userList.forEach((user) => {
        const existingUser = grouped[key].userList.find(
          (u) => u.userId === user.userId,
        );

        const userInfo = {
          userDuration: user.userDuration,
          userPercent: user.userPercent,
        };

        if (existingUser) {
          if (item.type === StatisticChartType.STANDARD) {
            existingUser.standardInfo = userInfo;
          } else if (item.type === StatisticChartType.COMPARE) {
            existingUser.compareInfo = userInfo;
          }
        } else {
          grouped[key].userList.push({
            userId: user.userId,
            userName: user.userName,
            userAvatar: user.userAvatar,
            userAvatarColor: user.userAvatarColor,
            ...(item.type === StatisticChartType.STANDARD
              ? { standardInfo: userInfo }
              : { compareInfo: userInfo }),
          });
        }
      });
    });

    return Object.values(grouped);
  };

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

  // Get table info (statistic team standard categories)
  const { isFetchingStatisticTableInTeamTagLineChart } =
    useStatisticTableInTeamTagLineChart({
      filter: {
        fromDate: startDate ? `${formatDateToYMD(startDate)}` : '',
        endDate: endDate ? `${formatDateToYMD(endDate)}` : '',
        userIds:
          orderingOptions?.user_ids?.length == 0
            ? (listMemberTeam ?? []).map((user) => Number(user.id)).join(',')
            : selectedMembers?.filter(Boolean).join(','),
        largeCategoryId: selectedLarge?.value,
        mediumCategoryId: selectedMedium?.value,
        smallCategoryId: selectedSmall?.value,
        organizationId: String(selectedOrganization?.value),
        selectedTags: selectedTags || [],
        organizationMemberId:
          selectedOrganization?.type === OrganizationStatisticType.CALENDAR
            ? String(selectedOrganizationSideBar?.value || '')
            : undefined,
      },
      condition: [Boolean(selectedOrganization?.value != ALL_TEAM_STATISTIC)],
      onSuccess: (data) => {
        if (!data) return;
        let tableDetail: TagTableRowDetailWithType[] = [];
        if (
          selectedOrganization &&
          !selectedLarge &&
          !selectedMedium &&
          !selectedSmall
        ) {
          tableDetail = buildTableDetail(
            data.largeCategories,
            StatisticChartType.STANDARD,
          );
        } else if (
          selectedOrganization &&
          selectedLarge &&
          !selectedMedium &&
          !selectedSmall
        ) {
          tableDetail = buildTableDetail(
            data.mediumCategories,
            StatisticChartType.STANDARD,
          );
        } else if (
          selectedOrganization &&
          selectedLarge &&
          selectedMedium &&
          !selectedSmall
        ) {
          tableDetail = buildTableDetail(
            data.smallCategories,
            StatisticChartType.STANDARD,
          );
        } else if (
          selectedOrganization &&
          selectedLarge &&
          selectedMedium &&
          selectedSmall
        ) {
          tableDetail = buildTableDetail(
            data.smallCategories,
            StatisticChartType.STANDARD,
          );
        }

        setStandardTableData(tableDetail);
        setHasFetchedStandardCategories(true);
      },
    });

  // Get table info (statistic team compare categories)
  const { isFetchingStatisticTableInTeamTagLineChartCompare } =
    useStatisticTableInTeamTagLineChartCompare({
      filter: {
        fromDate: startDateCompare
          ? `${formatDateToYMD(startDateCompare)}`
          : '',
        endDate: endDateCompare ? `${formatDateToYMD(endDateCompare)}` : '',
        userIds:
          orderingOptions?.user_ids?.length == 0
            ? (listMemberTeam ?? []).map((user) => Number(user.id)).join(',')
            : selectedMembers?.filter(Boolean).join(','),
        largeCategoryId: selectedLarge?.value,
        mediumCategoryId: selectedMedium?.value,
        smallCategoryId: selectedSmall?.value,
        organizationId: String(selectedOrganization?.value),
        selectedTags: selectedTags || [],
        organizationMemberId:
          selectedOrganization?.type === OrganizationStatisticType.CALENDAR
            ? String(selectedOrganizationSideBar?.value || '')
            : undefined,
      },
      condition: [Boolean(selectedOrganization?.value != ALL_TEAM_STATISTIC)],
      onSuccess: (data) => {
        if (!data) return;
        let tableDetail: TagTableRowDetailWithType[] = [];
        if (
          selectedOrganization &&
          !selectedLarge &&
          !selectedMedium &&
          !selectedSmall
        ) {
          tableDetail = buildTableDetail(
            data.largeCategories,
            StatisticChartType.COMPARE,
          );
        } else if (
          selectedOrganization &&
          selectedLarge &&
          !selectedMedium &&
          !selectedSmall
        ) {
          tableDetail = buildTableDetail(
            data.mediumCategories,
            StatisticChartType.COMPARE,
          );
        } else if (
          selectedOrganization &&
          selectedLarge &&
          selectedMedium &&
          !selectedSmall
        ) {
          tableDetail = buildTableDetail(
            data.smallCategories,
            StatisticChartType.COMPARE,
          );
        } else if (
          selectedOrganization &&
          selectedLarge &&
          selectedMedium &&
          selectedSmall
        ) {
          tableDetail = buildTableDetail(
            data.smallCategories,
            StatisticChartType.COMPARE,
          );
        }

        setCompareTableData(tableDetail);
        setHasFetchedCompareCategories(true);
      },
    });

  useEffect(() => {
    if (hasFetchedStandardCategories && hasFetchedCompareCategories) {
      const mergedTableData = mergeCategories([
        ...(standardTableData || []),
        ...(compareTableData || []),
      ]);
      const totalStandardDurationList = (standardTableData || [])
        .map((item) => item.tagDuration)
        .filter(Boolean); // remove null, undefined, ''

      const totalCompareDurationList = (compareTableData || [])
        .map((item) => item.tagDuration)
        .filter(Boolean);

      setTotalStandardDuration(
        totalDurationsForStatistic(totalStandardDurationList),
      );
      setTotalCompareDuration(
        totalDurationsForStatistic(totalCompareDurationList),
      );

      setMergedTableData(mergedTableData);
      setTagCollapseStatuses(
        mergedTableData.map((tag) => {
          return {
            tagId: tag.tagId!,
            status: false,
            organizationId: tag.organizationId,
          };
        }),
      );
      handleTagSelection(mergedTableData);
      setHasFetchedStandardCategories(false);
      setHasFetchedCompareCategories(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    hasFetchedCompareCategories,
    hasFetchedCompareCategories,
    standardTableData,
    compareTableData,
  ]);

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
    if(selectedOrganization?.value != ALL_TEAM_STATISTIC && !selectedTag) return;

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
    if (!dataPoint || !dataPoint.type) {
      tooltipEl.style.display = 'none';
      return;
    }

    const chart = context.chart;
    const hoveredUserId = tooltipModel.dataPoints[0]?.raw?.user?.id;

    chart.data.datasets.forEach((ds: any, index: number) => {
      const meta = chart.getDatasetMeta(index);

      // Ensure you have stored user.id in each dataset (e.g., ds.data[0].user.id)
      if (ds.data[0].user.id == hoveredUserId) {
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
      new Map(
        lineChartData.datasets
          .flatMap((d) => d.data)
          .filter(
            (point: any) => point.x == dataPoint.x && point.y == dataPoint.y,
          )
          .map((point: any) => [
            `${point.user.id}-${point.type == StatisticChartType.COMPARE ? `${point.startDate} - ${point.endDate}` : `${point.anotherStartDate} - ${point.anotherEndDate}`}`,
            point,
          ]),
      ).values(),
    );

    if (!tooltipEl._reactRoot) {
      tooltipEl._reactRoot = ReactDOM.createRoot(tooltipEl);
    }
    tooltipEl._reactRoot.render(
      <TeamDockCompareLineChartTooltip
        data={matchingDataPoints}
        selectedOptionName={selectedTag?.name || ''}
      />,
    );

    const { offsetLeft, offsetTop } = context.chart.canvas;
    const left = getSafeTooltipLeft({
      offsetLeft,
      caretX: tooltipModel.caretX,
      tooltipWidth: 260,
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

            return isNaN(labels[index] as any)
              ? convertToStatisticJapaneseLabels(
                  labels[index],
                  lineChartViewBy?.value as string,
                  false,
                )
              : '';
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
      selectedOrganization?.value != ALL_TEAM_STATISTIC &&
      statisticUserTaskDurationsList &&
      statisticUserTaskDurationsList?.length > 0
    ) {
      const loadImages = async () => {
        const imagePromises = statisticUserTaskDurationsList.map((item) =>
          createLineChartAvatarImage(
            item?.user || {
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
    if (selectedOrganization?.value != ALL_TEAM_STATISTIC) {
      const standardLabels: { name: string; color: string }[] = [];
      const comparedLabels: { name: string; color: string }[] = [];
      const standardDateLabels: string[] = [];
      const compareDateLabels: string[] = [];
      const datasets: any[] = [];

      const standardDurationList =
        statisticUserTaskDurationsList?.[0]?.durations || [];
      standardDurationList.map((duration, index) => {
        standardDateLabels.push(duration.startDate);
        if (
          index === standardDurationList.length - 1 &&
          String(standardDurationList.at(-1)?.endDate) !=
            String(standardDurationList.at(-1)?.startDate)
        ) {
          const endDate = standardDurationList.at(-1)?.endDate;
          if (endDate) {
            standardDateLabels.push(endDate);
          }
        }
      });

      const compareDurationList =
        statisticUserTaskDurationsCompareList?.[0]?.durations || [];
      compareDurationList.map((duration, index) => {
        compareDateLabels.push(duration.startDate);
        if (
          index === compareDurationList.length - 1 &&
          String(compareDurationList.at(-1)?.endDate) !=
            String(compareDurationList.at(-1)?.startDate)
        ) {
          const endDate = compareDurationList.at(-1)?.endDate;
          if (endDate) {
            compareDateLabels.push(endDate);
          }
        }
      });

      const generateDataWithAlignment = (
        durations: any[],
        compareDurations: any[],
        type: string,
        user: {
          id: number;
          fullName: string;
          avatarColor: string;
          avatar: string | null;
        },
      ) => {
        const shownLabels = [...standardDateLabels];
        if (standardDateLabels.length < compareDateLabels.length) {
          const numOfHiddenLabels =
            compareDateLabels.length - standardDateLabels.length;
          for (let i = 0; i < numOfHiddenLabels; i++) {
            shownLabels.push(`${i}`);
          }
        }
        const data = shownLabels
          .map((label, index) => {
            let foundDuration;
            let anotherDuration;
            if (type == StatisticChartType.COMPARE) {
              foundDuration = compareDurations[index];
              anotherDuration = durations[index];
            } else {
              foundDuration = durations[index];
              anotherDuration = compareDurations[index];
            }

            return foundDuration
              ? {
                  x: label,
                  y: foundDuration.duration
                    ? convertTimeToDecimal(foundDuration.duration)
                    : 0,
                  startDate: foundDuration.startDate,
                  endDate: foundDuration.endDate,
                  duration: foundDuration.duration,
                  anotherStartDate: anotherDuration
                    ? anotherDuration.startDate
                    : null,
                  anotherEndDate: anotherDuration
                    ? anotherDuration.endDate
                    : null,
                  anotherDuration: anotherDuration
                    ? anotherDuration.duration
                    : null,
                  type,
                  user,
                }
              : null;
          })
          .filter((dataPoint) => dataPoint !== null);

        // Add one more item with the same data as the last one
        if (durations.length > 0 && shownLabels.length > 0) {
          const lastItem = data[data.length - 1];
          if (
            String(durations.at(-1).startDate) !=
            String(durations.at(-1).endDate)
          ) {
            const clonedItem = {
              ...lastItem,
              x: shownLabels.at(-1)!,
            };
            data.push(clonedItem);
          }
        }
        return data;
      };

      statisticUserTaskDurationsList &&
        statisticUserTaskDurationsList?.length > 0 &&
        statisticUserTaskDurationsList.forEach((userTaskDuration) => {
          if (userTaskDuration.user) {
            standardLabels.push({
              color: userTaskDuration?.user?.avatarColor || getRandomColor(),
              name: userTaskDuration?.user?.fullName,
            });
            const compareUser = statisticUserTaskDurationsCompareList?.find(
              (compare) => compare?.user?.id == userTaskDuration?.user?.id,
            );
            datasets.push({
              label: userTaskDuration?.user?.fullName,
              data: generateDataWithAlignment(
                userTaskDuration.durations,
                compareUser?.durations ?? [],
                StatisticChartType.STANDARD,
                userTaskDuration?.user,
              ),
              borderColor:
                userTaskDuration?.user?.avatarColor || getRandomColor(),
              backgroundColor: 'transparent',
              fill: true,
              tension: 0,
              pointRadius: 4,
              pointBorderColor: 'transparent',
              pointHoverRadius: 6,
              pointHoverBackgroundColor:
                userTaskDuration?.user?.avatarColor || getRandomColor(),
              pointHoverBorderColor: 'transparent',
              pointHoverBorderWidth: 2,
            });
          }
        });

      statisticUserTaskDurationsCompareList &&
        statisticUserTaskDurationsCompareList?.length > 0 &&
        statisticUserTaskDurationsCompareList.forEach((userTaskDuration) => {
          if (userTaskDuration?.user) {
            comparedLabels.push({
              color: userTaskDuration?.user?.avatarColor || getRandomColor(),
              name: userTaskDuration?.user?.fullName,
            });
            const standardUser = statisticUserTaskDurationsList?.find(
              (compare) => compare?.user?.id == userTaskDuration?.user?.id,
            );
            datasets.push({
              label: userTaskDuration?.user?.fullName,
              data: generateDataWithAlignment(
                standardUser?.durations ?? [],
                userTaskDuration.durations,
                StatisticChartType.COMPARE,
                userTaskDuration?.user,
              ),
              borderColor:
                userTaskDuration?.user?.avatarColor || getRandomColor(),
              backgroundColor: 'transparent',
              borderDash: [3, 3],
              fill: true,
              tension: 0,
              pointRadius: 4,
              pointBorderColor: 'transparent',
              pointHoverRadius: 6,
              pointHoverBackgroundColor:
                userTaskDuration?.user?.avatarColor || getRandomColor(),
              pointHoverBorderColor: 'transparent',
              pointHoverBorderWidth: 2,
            });
          }
        });

      setStandardDateLabels(standardDateLabels);
      setCompareDateLabels(compareDateLabels);
      setLineChartData({
        labels: standardDateLabels,
        datasets: datasets,
      });
      setStandardLegendList(standardLabels);
      setCompareLegendList(comparedLabels);
    }
  }, [
    statisticUserTaskDurationsList,
    statisticUserTaskDurationsCompareList,
    selectedOrganization?.value,
  ]);

  useEffect(() => {
    if (
      selectedOrganization?.value == ALL_TEAM_STATISTIC &&
      statisticTeamDockAllTeamLineChartTaskDurationsList &&
      statisticTeamDockAllTeamLineChartTaskDurationsListCompare
    ) {
      const standardLabels: { name: string; color: string }[] = [];
      const comparedLabels: { name: string; color: string }[] = [];
      let standardDateLabels: string[] = [];
      let compareDateLabels: string[] = [];
      const tableDetail: TeamDockAllTeamTableRowDetail[] = [];
      const standardTotalDurationList: string[] = [];
      const compareTotalDurationList: string[] = [];

      const normalizeStandardTaskDurations =
        normalizeDurationUsersWithTeamDockStatisticAllTeam(
          statisticTeamDockAllTeamLineChartTaskDurationsList,
          selectedOrganizationOptionInTable,
          selectedOrganizationSideBar?.value as number,
        );

      const normalizeComparedTaskDurations =
        normalizeDurationUsersWithTeamDockStatisticAllTeam(
          statisticTeamDockAllTeamLineChartTaskDurationsListCompare,
          selectedOrganizationOptionInTable,
          selectedOrganizationSideBar?.value as number,
        );

      if (
        normalizeStandardTaskDurations?.data &&
        normalizeStandardTaskDurations?.data?.length > 0
      ) {
        normalizeStandardTaskDurations.data.forEach((data) => {
          tableDetail.push({
            id: data.organizationId,
            name: data.organizationName,
            duration: data.duration,
            percent: data?.percent || 0,
            type: StatisticChartType.STANDARD,
            userList: data.users.map((user) => ({
              userId: user.id,
              userName: user.fullName,
              userAvatar: user.avatar,
              userAvatarColor: user.avatarColor,
              userDuration: user.totalDuration,
              userPercent: user.percent,
            })),
          });

          standardTotalDurationList.push(data.duration);
        });
      }

      if (
        normalizeComparedTaskDurations?.data &&
        normalizeComparedTaskDurations?.data?.length > 0
      ) {
        normalizeComparedTaskDurations.data.forEach((data) => {
          tableDetail.push({
            id: data.organizationId,
            name: data.organizationName,
            duration: data.duration,
            percent: data?.percent || 0,
            type: StatisticChartType.COMPARE,
            userList: data.users.map((user) => ({
              userId: user.id,
              userName: user.fullName,
              userAvatar: user.avatar,
              userAvatarColor: user.avatarColor,
              userDuration: user.totalDuration,
              userPercent: user.percent,
            })),
          });

          comparedLabels.push({
            color: data.color || getRandomColor(),
            name: data.organizationName,
          });

          compareTotalDurationList.push(data.duration);
        });
      }
      setTotalStandardDuration(
        totalDurationsForStatistic(standardTotalDurationList),
      );
      setTotalCompareDuration(
        totalDurationsForStatistic(compareTotalDurationList),
      );

      const mergedCategories =
        mergeTeamDockLineChartTableItems(
          tableDetail,
          selectedOrganizationSideBar?.value as number,
          true,
        ) || [];
      setMergedTableData(mergedCategories);

      setTagCollapseStatuses(
        mergedCategories.map((organization) => {
          return {
            tagId:
              organization.tagId == AllTeamStatisticOption.MAIN_TEAM
                ? AllTeamStatisticOption.MAIN_TEAM
                : organization.tagId == AllTeamStatisticOption.SUB_TEAMS
                  ? AllTeamStatisticOption.SUB_TEAMS
                  : AllTeamStatisticOption.CALENDAR,
            status: false,
          };
        }),
      );

      if (
        normalizeStandardTaskDurations.durations &&
        normalizeStandardTaskDurations.durations.length > 0
      ) {
        const durationList = normalizeStandardTaskDurations.durations.map(
          (duration) => ({
            startDate: duration.startDate,
            endDate: duration.endDate,
          }),
        );
        standardDateLabels =
          extractDateLabelsListFromTaskDuration(durationList);
      }
      if (
        normalizeComparedTaskDurations.durations &&
        normalizeComparedTaskDurations.durations.length > 0
      ) {
        const durationList = normalizeComparedTaskDurations.durations.map(
          (duration) => ({
            startDate: duration.startDate,
            endDate: duration.endDate,
          }),
        );
        compareDateLabels = extractDateLabelsListFromTaskDuration(durationList);
      }

      const shownLabels = generateShownLineChartDateLabels(
        standardDateLabels,
        compareDateLabels,
      );
      const datasetMap = new Map<string, CategoryLineChartDatasetInfo>();

      const foundMergeCategories = mergedCategories.find(
        (tag) => tag.tagId == selectedOrganizationOptionInTable,
      );

      const loadImages = async () => {
        const imagePromises =
          foundMergeCategories?.userList.map((user) =>
            createLineChartAvatarImage({
              avatar: user.userAvatar || '',
              avatarColor: user.userAvatarColor,
              id: user.userId,
              fullName: user.userName,
            }),
          ) ?? [];

        const loadedImages = await Promise.all(imagePromises);
        setImages(loadedImages);
      };

      loadImages();

      foundMergeCategories?.userList.forEach((user) => {
        const color = user.userAvatarColor || getRandomColor();
        standardLabels.push({
          color: user.userAvatarColor || getRandomColor(),
          name: user.userName,
        });

        datasetMap.set(
          `${user.userId}-${user.userName}-${StatisticChartType.STANDARD}`,
          {
            label: user.userName,
            data: [],
            borderColor: color,
            backgroundColor: 'transparent',
            borderDash: [],
            fill: true,
            tension: 0,
            pointRadius: 4,
            pointBorderColor: 'transparent',
            pointHoverRadius: 6,
            pointHoverBackgroundColor: color,
            pointHoverBorderColor: 'transparent',
            pointHoverBorderWidth: 2,
          },
        );
      });
      foundMergeCategories?.userList.forEach((user) => {
        const color = user.userAvatarColor || getRandomColor();
        comparedLabels.push({
          color: user.userAvatarColor || getRandomColor(),
          name: user.userName,
        });
        datasetMap.set(
          `${user.userId}-${user.userName}-${StatisticChartType.COMPARE}`,
          {
            label: user.userName,
            data: [],
            borderColor: color,
            backgroundColor: 'transparent',
            borderDash: [3, 3],
            fill: true,
            tension: 0,
            pointRadius: 4,
            pointBorderColor: 'transparent',
            pointHoverRadius: 6,
            pointHoverBackgroundColor: color,
            pointHoverBorderColor: 'transparent',
            pointHoverBorderWidth: 2,
          },
        );
      });

      setStandardLegendList(standardLabels);
      setCompareLegendList(comparedLabels);

      shownLabels.forEach((labelDate, index) => {
        const standardDetail = normalizeStandardTaskDurations.durations[index];
        const comparedDetail = normalizeComparedTaskDurations.durations[index];

        foundMergeCategories?.userList.forEach((user) => {
          const standardCat = standardDetail?.data[0].users.find(
            (standardCategory) => standardCategory.id == user.userId,
          );
          const compareCat = comparedDetail?.data[0].users.find(
            (comparedCategory) => comparedCategory.id == user.userId,
          );

          const x = labelDate;

          const standardDataset = datasetMap.get(
            `${user.userId}-${user.userName}-${StatisticChartType.STANDARD}`,
          );

          standardDataset?.data.push({
            x,
            y: standardCat
              ? convertTimeToDecimal(standardCat.totalDuration)
              : 0,
            startDate: standardDetail?.startDate,
            endDate: standardDetail?.endDate,
            duration: standardCat?.totalDuration,
            label: user.userName,
            type: StatisticChartType.STANDARD,
            anotherDuration: compareCat?.totalDuration,
            anotherStartDate: comparedDetail?.startDate,
            anotherEndDate: comparedDetail?.endDate,
            user: {
              avatar: user?.userAvatar || '',
              avatarColor: user?.userAvatarColor || getRandomColor(),
              fullName: user.userName,
              id: user.userId,
            },
          });
        });
      });

      shownLabels.forEach((labelDate, index) => {
        const standardDetail = normalizeStandardTaskDurations.durations[index];
        const comparedDetail = normalizeComparedTaskDurations.durations[index];

        foundMergeCategories?.userList.forEach((user) => {
          const standardCat = standardDetail?.data[0].users.find(
            (standardCategory) => standardCategory.id == user.userId,
          );
          const compareCat = comparedDetail?.data[0].users.find(
            (comparedCategory) => comparedCategory.id == user.userId,
          );

          const x = labelDate;

          const compareDataset = datasetMap.get(
            `${user.userId}-${user.userName}-${StatisticChartType.COMPARE}`,
          );

          compareDataset?.data.push({
            x,
            y: compareCat ? convertTimeToDecimal(compareCat.totalDuration) : 0,
            startDate: comparedDetail?.startDate,
            endDate: comparedDetail?.endDate,
            duration: compareCat?.totalDuration,
            label: user.userName,
            type: StatisticChartType.COMPARE,
            anotherDuration: standardCat?.totalDuration,
            anotherStartDate: standardDetail?.startDate,
            anotherEndDate: standardDetail?.endDate,
            user: {
              avatar: user?.userAvatar || '',
              avatarColor: user?.userAvatarColor || getRandomColor(),
              fullName: user.userName,
              id: user.userId,
            },
          });
        });
      });

      setStandardDateLabels(standardDateLabels);
      setCompareDateLabels(compareDateLabels);

      setLineChartData({
        labels: standardDateLabels,
        datasets: Array.from(datasetMap.values()) || [],
      });
    }
  }, [
    statisticTeamDockAllTeamLineChartTaskDurationsList,
    statisticTeamDockAllTeamLineChartTaskDurationsListCompare,
    selectedOrganizationOptionInTable,
    selectedOrganizationSideBar,
    selectedOrganization,
  ]);

  // Sort by percent difference
  const sortByPercentDifference = (
    data: TeamDockMergedTable[],
    sortingType: string,
  ) => {
    const sortedArr = data.slice().sort((rowA, rowB) => {
      const rowAStandard = Number(rowA.standardInfo?.percent || 0);
      const rowACompare = Number(rowA.compareInfo?.percent || 0);
      const rowBStandard = Number(rowB.standardInfo?.percent || 0);
      const rowBCompare = Number(rowB.compareInfo?.percent || 0);

      const rowADiff = rowAStandard - rowACompare;
      const rowBDiff = rowBStandard - rowBCompare;

      return sortingType == SortingType.ASC
        ? rowADiff - rowBDiff
        : rowBDiff - rowADiff;
    });
    setMergedTableData(sortedArr);
  };

  // Sort by duration difference
  const sortByDurationDifference = (
    data: TeamDockMergedTable[],
    sortingType: string,
  ) => {
    const sortedArr = data.slice().sort((rowA, rowB) => {
      const rowAStandard = convertDurationToTotalMinutes(
        rowA.standardInfo?.duration || DEFAULT_TIME_TEXT,
      );
      const rowACompare = convertDurationToTotalMinutes(
        rowA.compareInfo?.duration || DEFAULT_TIME_TEXT,
      );
      const rowADiff = rowAStandard - rowACompare;

      const rowBStandard = convertDurationToTotalMinutes(
        rowB.standardInfo?.duration || DEFAULT_TIME_TEXT,
      );
      const rowBCompare = convertDurationToTotalMinutes(
        rowB.compareInfo?.duration || DEFAULT_TIME_TEXT,
      );
      const rowBDiff = rowBStandard - rowBCompare;

      return sortingType == SortingType.ASC
        ? rowADiff - rowBDiff
        : rowBDiff - rowADiff;
    });
    setMergedTableData(sortedArr);
  };

  // Columns definition
  const columns: ColumnDef<TeamDockMergedTable>[] = [
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
                  if (info.row.original.organizationId) {
                    setSelectedOrganizationInTable(
                      info.row.original.organizationId,
                    );
                  }
                  setSelectedOrganizationOptionInTable(
                    info.row.original.tagId as AllTeamStatisticOption,
                  );
                }
              }}
            />
            <div className="w-full">
              <div
                className={`flex flex-col items-start gap-2 ${
                  collapseStatus &&
                  info.row.original?.userList?.filter((user) =>
                    selectedMembers.includes(user.userId),
                  ).length > 0 &&
                  'mb-8'
                }`}>
                <div className={`flex justify-between items-center w-full`}>
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
                <div className="font-normal text-sm text-[#000000] flex items-center gap-[1px] w-[calc(100%_-20px)] border-b-[1px] border-[#D2DBE1] pb-1">
                  <p>
                    {startDate && getCategoryFormattedDate(startDate)}(
                    {getJapaneseDayName(String(startDate))})
                  </p>
                  ~
                  <p>
                    {endDate && getCategoryFormattedDate(endDate)}(
                    {getJapaneseDayName(String(endDate))})
                  </p>
                </div>
                <div className="font-normal text-sm text-[#000000] flex items-center gap-[1px] w-[calc(100%_-20px)] border-b-[1px] border-[#D2DBE1] pb-1">
                  <p>
                    {startDateCompare &&
                      getCategoryFormattedDate(startDateCompare)}
                    ({getJapaneseDayName(String(startDateCompare))})
                  </p>
                  ~
                  <p>
                    {endDateCompare && getCategoryFormattedDate(endDateCompare)}
                    ({getJapaneseDayName(String(endDateCompare))})
                  </p>
                </div>
                <p className="font-normal text-sm text-[#000000]">比較</p>
              </div>

              {collapseStatus &&
                info.row.original?.userList &&
                info.row.original?.userList.length > 0 && (
                  <div className="flex flex-col gap-8">
                    {info.row.original?.userList
                      ?.filter((user) => selectedMembers.includes(user.userId))
                      .map((user) => {
                        return (
                          <div
                            className="flex flex-col items-start gap-2"
                            key={user.userId}>
                            <div className="flex items-center gap-2">
                              <CustomUserAvatar
                                avatarUrl={user?.userAvatar || ''}
                                avatarColor={user?.userAvatarColor || ''}
                                size={24}
                              />
                              <p className="text-sm font-medium max-w-full break-all line-clamp-1 text-left text-black">
                                {user.userName}
                              </p>
                            </div>
                            <div className="font-normal text-sm text-[#000000] flex items-center gap-[1px] w-[calc(100%_-20px)] border-b-[1px] border-[#D2DBE1] pb-1">
                              <p>
                                {startDate &&
                                  getCategoryFormattedDate(startDate)}
                                ({getJapaneseDayName(String(startDate))})
                              </p>
                              ~
                              <p>
                                {endDate && getCategoryFormattedDate(endDate)}(
                                {getJapaneseDayName(String(endDate))})
                              </p>
                            </div>
                            <div className="font-normal text-sm text-[#000000] flex items-center gap-[1px] w-[calc(100%_-20px)] border-b-[1px] border-[#D2DBE1] pb-1">
                              <p>
                                {startDateCompare &&
                                  getCategoryFormattedDate(startDateCompare)}
                                ({getJapaneseDayName(String(startDateCompare))})
                              </p>
                              ~
                              <p>
                                {endDateCompare &&
                                  getCategoryFormattedDate(endDateCompare)}
                                ({getJapaneseDayName(String(endDateCompare))})
                              </p>
                            </div>
                            <p className="font-normal text-sm text-[#000000]">
                              比較
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
            className="flex gap-1 items-center justify-center"
            onClick={() => {
              if (
                !durationSortingStatus ||
                durationSortingStatus == SortingType.DESC
              ) {
                setDurationSortingStatus(SortingType.ASC);
                sortByDurationDifference(mergedTableData, SortingType.ASC);
              } else {
                setDurationSortingStatus(SortingType.DESC);
                sortByDurationDifference(mergedTableData, SortingType.DESC);
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
        const collapseStatus =
          tagCollapseStatuses.find((tagCollapseStatus) =>
            selectedOrganization?.value != ALL_TEAM_STATISTIC
              ? tagCollapseStatus.tagId == info.row.original.tagId &&
                info.row.original.organizationId ==
                  tagCollapseStatus?.organizationId
              : tagCollapseStatus.tagId == info.row.original.tagId,
          )?.status || false;

        return (
          <div className="w-full px-[18px]">
            <div
              className={`flex flex-col gap-2 ${
                collapseStatus &&
                info.row.original?.userList?.filter((user) =>
                  selectedMembers.includes(user.userId),
                ).length > 0 &&
                'mb-8'
              }`}>
              <div className="h-[24px]"></div>
              <div className="font-medium flex text-sm justify-end text-black w-full border-b-[1px] border-[#D2DBE1] pb-1">
                <p>
                  {info.row.original.standardInfo?.duration.split(':')[0] ||
                    '00'}
                  時間
                </p>
                <p>
                  {info.row.original.standardInfo?.duration.split(':')[1] ||
                    '00'}
                  分
                </p>
              </div>
              <div className="font-medium flex text-sm justify-end text-black w-full border-b-[1px] border-[#D2DBE1] pb-1">
                <p>
                  {info.row.original.compareInfo?.duration.split(':')[0] ||
                    '00'}
                  時間
                </p>
                <p>
                  {info.row.original.compareInfo?.duration.split(':')[1] ||
                    '00'}
                  分
                </p>
              </div>
              <div className="font-medium flex text-sm justify-end text-black">
                <p>
                  {subtractDurations(
                    info.row.original.standardInfo?.duration ||
                      DEFAULT_TIME_TEXT,
                    info.row.original.compareInfo?.duration ||
                      DEFAULT_TIME_TEXT,
                  )}
                </p>
              </div>
            </div>

            {collapseStatus &&
              info.row.original?.userList &&
              info.row.original?.userList.length > 0 && (
                <div className="flex flex-col gap-8">
                  {info.row.original?.userList
                    ?.filter((user) => selectedMembers.includes(user.userId))
                    .map((user) => {
                      return (
                        <div key={user.userId} className="flex flex-col gap-2">
                          <div className="h-[24px]"></div>
                          <div className="font-medium flex text-sm justify-end text-black w-full border-b-[1px] border-[#D2DBE1] pb-1">
                            <p>
                              {user?.standardInfo?.userDuration.split(':')[0] ||
                                '00'}
                              時間
                            </p>
                            <p>
                              {user?.standardInfo?.userDuration.split(':')[1] ||
                                '00'}
                              分
                            </p>
                          </div>
                          <div className="font-medium flex text-sm justify-end text-black w-full border-b-[1px] border-[#D2DBE1] pb-1">
                            <p>
                              {user?.compareInfo?.userDuration.split(':')[0] ||
                                '00'}
                              時間
                            </p>
                            <p>
                              {user?.compareInfo?.userDuration.split(':')[1] ||
                                '00'}
                              分
                            </p>
                          </div>
                          <div className="font-medium flex text-sm justify-end text-black">
                            <p>
                              {subtractDurations(
                                user?.standardInfo?.userDuration ||
                                  DEFAULT_TIME_TEXT,
                                user?.compareInfo?.userDuration ||
                                  DEFAULT_TIME_TEXT,
                              )}
                            </p>
                          </div>
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
            className="flex gap-1 items-center justify-center cursor-pointer"
            onClick={() => {
              if (
                !percentageSortingStatus ||
                percentageSortingStatus == SortingType.DESC
              ) {
                setPercentageSortingStatus(SortingType.ASC);
                sortByPercentDifference(mergedTableData, SortingType.ASC);
              } else {
                setPercentageSortingStatus(SortingType.DESC);
                sortByPercentDifference(mergedTableData, SortingType.DESC);
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
        const collapseStatus =
          tagCollapseStatuses.find((tagCollapseStatus) =>
            selectedOrganization?.value != ALL_TEAM_STATISTIC
              ? tagCollapseStatus.tagId == info.row.original.tagId &&
                info.row.original.organizationId ==
                  tagCollapseStatus?.organizationId
              : tagCollapseStatus.tagId == info.row.original.tagId,
          )?.status || false;

        const standardPercent =
          Number(info.row.original.standardInfo?.percent) || 0;
        const comparePercent =
          Number(info.row.original.compareInfo?.percent) || 0;
        const difference = standardPercent - comparePercent;

        return (
          <div className="w-full px-[18px]">
            <div
              className={`flex flex-col gap-2 ${
                collapseStatus &&
                info.row.original?.userList?.filter((user) =>
                  selectedMembers.includes(user.userId),
                ).length > 0 &&
                'mb-8'
              }`}>
              <div className="h-[24px]"></div>
              <p className="font-medium flex text-sm justify-end text-black w-full border-b-[1px] border-[#D2DBE1] pb-1">
                {standardPercent}%
              </p>
              <p className="font-medium flex text-sm justify-end text-black w-full border-b-[1px] border-[#D2DBE1] pb-1">
                {comparePercent}%
              </p>
              <p className="font-medium flex text-sm justify-end text-black">
                {difference}%
              </p>
            </div>
            {collapseStatus &&
              info.row.original?.userList &&
              info.row.original?.userList.length > 0 && (
                <div className="flex flex-col gap-8">
                  {info.row.original?.userList
                    ?.filter((user) => selectedMembers.includes(user.userId))
                    .map((user) => {
                      const standardPercent =
                        Number(user?.standardInfo?.userPercent) || 0;
                      const comparePercent =
                        Number(user?.compareInfo?.userPercent) || 0;
                      const difference = standardPercent - comparePercent;
                      return (
                        <div key={user.userId} className="flex flex-col gap-2">
                          <div className="h-[24px]"></div>
                          <p className="font-medium flex text-sm justify-end text-black w-full border-b-[1px] border-[#D2DBE1] pb-1">
                            {standardPercent}%
                          </p>
                          <p className="font-medium flex text-sm justify-end text-black w-full border-b-[1px] border-[#D2DBE1] pb-1">
                            {comparePercent}%
                          </p>
                          <p className="font-medium flex text-sm justify-end text-black">
                            {difference}%
                          </p>
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
    data: mergedTableData,
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

    const enabledViews = getCompareLineChartEnableViews(
      startDate,
      endDate as Date,
      startDateCompare,
      endDateCompare as Date,
    );

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
                        <ActionFilterTeamTagStatistic
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
                  className={`${selectedOrganization && !selectedLarge && !selectedMedium && !selectedSmall ? 'text-white bg-[#0068B6]' : 'text-[#77858F] bg-[#fff] border-[#77858F] border-[1px]'} rounded-[100px] w-[112px] h-[34px] text-sm flex justify-center items-center`}>
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
                      setMergedTableData([]);
                      setSelectedTag(null);
                      handleSelectOrganization(data);
                    }}
                  />
                </div>
              </div>
              {selectedLarge ? (
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
                  className={`${selectedOrganization && selectedLarge && !selectedMedium && !selectedSmall ? 'text-white bg-[#0068B6]' : 'text-[#77858F] bg-[#fff] border-[#77858F] border-[1px]'} rounded-[100px] w-[112px] h-[34px] text-sm flex justify-center items-center`}>
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
                      setMergedTableData([]);
                      setSelectedTag(null);
                      handleSelectLarge(data);
                    }}
                    disabled={!selectedOrganization || isHasLoading}
                  />
                </div>
              </div>
              {selectedMedium ? (
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
                  className={`${selectedOrganization && selectedLarge && selectedMedium && !selectedSmall ? 'text-white bg-[#0068B6]' : 'text-[#77858F] bg-[#fff] border-[#77858F] border-[1px]'} rounded-[100px] w-[112px] h-[34px] text-sm flex justify-center items-center`}>
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
                      setMergedTableData([]);
                      setSelectedTag(null);
                      handleSelectMedium(data);
                    }}
                    disabled={
                      !selectedLarge || isHasLoading || isDisableCalendar
                    }
                  />
                </div>
              </div>
              {selectedSmall ? (
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
                  className={`${selectedOrganization && selectedLarge && selectedMedium && selectedSmall ? 'text-white bg-[#0068B6]' : 'text-[#77858F] bg-[#fff] border-[#77858F] border-[1px]'} rounded-[100px] w-[112px] h-[34px] text-sm flex justify-center items-center`}>
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
                      setMergedTableData([]);
                      setSelectedTag(null);
                      handleSelectSmall(data);
                    }}
                    disabled={
                      !selectedMedium || isHasLoading || isDisableCalendar
                    }
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="mt-5 px-[30px]">
            <div className="flex justify-between w-full mb-4">
              <div>
                {startDate && endDate && (
                  <div className="flex items-center mb-3 gap-2">
                    <p className="bg-[#EBF1F7] w-[57px] h-[18px] text-[#0068B6] rounded-sm text-xs font-medium flex items-center justify-center">
                      基準期間
                    </p>
                    <div className="text-black text-xs font-normal flex items-center gap-[1px]">
                      <p>
                        {startDate && formatShowStatisticTask(startDate)}(
                        {getJapaneseDayName(String(startDate))})
                      </p>
                      ~
                      <p>
                        {endDate && formatShowStatisticTask(endDate)}(
                        {getJapaneseDayName(String(endDate))})
                      </p>
                    </div>
                    <p className="font-medium text-[16px]">
                      合計 {totalStandardDuration?.split(':')[0] || '00'}時間
                      {totalStandardDuration?.split(':')[1] || '00'}分
                    </p>
                  </div>
                )}
                {startDateCompare && endDateCompare && (
                  <div className="flex items-center mb-3 gap-2">
                    <p className="bg-[#F9EAEA] w-[57px] h-[18px] text-[#C32E2E] rounded-sm text-xs font-medium flex items-center justify-center">
                      比較期間
                    </p>
                    <div className="text-black text-xs font-normal flex items-center gap-[1px]">
                      <p>
                        {startDateCompare &&
                          formatShowStatisticTask(startDateCompare)}
                        ({getJapaneseDayName(String(startDateCompare))})
                      </p>
                      ~
                      <p>
                        {endDateCompare &&
                          formatShowStatisticTask(endDateCompare)}
                        ({getJapaneseDayName(String(endDateCompare))})
                      </p>
                    </div>
                    <p className="font-medium text-[16px]">
                      合計 {totalCompareDuration?.split(':')[0] || '00'}時間
                      {totalCompareDuration?.split(':')[1] || '00'}分
                    </p>
                  </div>
                )}
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
                    setMergedTableData([]);
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
                        disable={
                          isFetchingStatisticTableInTeamTagLineChart ||
                          isFetchingStatisticTableInTeamTagLineChartCompare ||
                          isFetchingStatisticUserTaskDurationsList ||
                          isFetchingStatisticUserTaskDurationsCompareList
                        }
                        color={member.color}
                        onChange={(state) => {
                          setMergedTableData([]);
                          setSelectedTag(null);
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

          {(!isFetchingStatisticUserTaskDurationsList &&
            !isFetchingStatisticUserTaskDurationsCompareList &&
            selectedOrganization?.value != ALL_TEAM_STATISTIC) ||
          (!isFetchingStatisticTeamDockAllTeamLineChartTaskDurationsList &&
            !isFetchingStatisticTeamDockAllTeamLineChartTaskDurationsListCompare &&
            selectedOrganization?.value == ALL_TEAM_STATISTIC) ? (
            <div
              style={{ position: 'relative' }}
              className={`h-[380px] ${expanded && 'w-[calc(100%_-_10px)]'}`}>
              <Line
                key={standardDateLabels.join('-') + compareDateLabels.join('-')}
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
          ) : (
            <RowSkeleton
              numberOfRows={1}
              className={`!h-[395px] w-[calc(100%_-_60px)] mx-auto`}
            />
          )}

          <div className="px-[30px]">
            {(!isFetchingStatisticUserTaskDurationsList &&
              !isFetchingStatisticUserTaskDurationsCompareList &&
              selectedOrganization?.value != ALL_TEAM_STATISTIC) ||
            (!isFetchingStatisticTeamDockAllTeamLineChartTaskDurationsList &&
              !isFetchingStatisticTeamDockAllTeamLineChartTaskDurationsListCompare &&
              selectedOrganization?.value == ALL_TEAM_STATISTIC) ? (
              <>
                <div className="flex gap-8 items-center justify-end flex-wrap mb-3">
                  <p className="bg-[#EBF1F7] w-[30px] h-[18px] text-[#0068B6] rounded-sm text-xs font-medium flex items-center justify-center">
                    基準
                  </p>
                  {standardLegendList.map((label, index) => {
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
                <div className="flex gap-8 items-center justify-end flex-wrap">
                  <p className="bg-[#F9EAEA] w-[30px] h-[18px] text-[#C32E2E] rounded-sm text-xs font-medium flex items-center justify-center">
                    比較
                  </p>
                  {compareLegendList.map((label, index) => {
                    return (
                      <div key={index} className="flex gap-1 items-center">
                        <div
                          className="w-8 h-1 border-t-2 border-dashed"
                          style={{ borderColor: label.color }}></div>
                        <p className="font-medium text-[#77858F] text-xs truncate max-w-[200px]">
                          {label.name}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <></>
            )}

            {(!isFetchingStatisticUserTaskDurationsList &&
              !isFetchingStatisticUserTaskDurationsCompareList &&
              selectedOrganization?.value != ALL_TEAM_STATISTIC) ||
            (!isFetchingStatisticTeamDockAllTeamLineChartTaskDurationsList &&
              !isFetchingStatisticTeamDockAllTeamLineChartTaskDurationsListCompare &&
              selectedOrganization?.value == ALL_TEAM_STATISTIC) ? (
              <Table
                className={`border border-[#D2DBE1] !ring-0 bg-white !pt-0 py-0 mt-5 rounded-md ${mergedTableData.length && 'max-h-[500px] overflow-y-auto'}`}>
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
            ) : (
              <StatisticLineChartTableSkeleton />
            )}
          </div>
        </div>
      )}
    </div>
  );
};
export default LineChartByTeamTagsCompare;
