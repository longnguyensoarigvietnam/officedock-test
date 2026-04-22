'use client';

import { useCallback } from 'react';

import { apiRouters } from '@constants/routers';
import {
  ERROR_FILE_DOWNLOAD,
  SUCCESS_EXPORT_MESSAGE,
} from '@constants/message';
import { ExportType, PeriodClassification } from '@constants/enums';

import { OptionDropdownType } from '@interfaces/common';

import { useSessionCache } from '@providers/SessionCacheProvider';
import { useToast } from '@providers/ToastProvider';

import { handleFileDownload } from '@utils/download';

import api from '@base/api';

interface FilterProps {
  endDate: string | Date;
  fromDate: string | Date;
  largeCategoryId?: number | string | null;
  mediumCategoryId?: number | string | null;
  smallCategoryId?: number | string | null;
  organizationIds?: string;
  organizationId?: string;
  /**
   * Display name used only for generating downloaded filename.
   * (e.g. organization/team label in teamdock UI)
   */
  organizationLabel?: string;
  /**
   * When teamdock selection is a single user, this is the label used
   * to generate the downloaded filename (from checkbox selection).
   */
  singleUserLabel?: string;
  tagIds?: OptionDropdownType[];
  totalDuration?: string;
  ordering: string;
  uids?: string;
  user_id?: number | string;
  user_ids?: OptionDropdownType[];
  isCompare?: boolean;
}

export const useTaskListDownload = ({
  filter,
  isTeam = false,
  is_tag_page = false,
}: {
  is_tag_page?: boolean;
  isTeam?: boolean;
  filter?: FilterProps;
}) => {
  const { data: session } = useSessionCache();
  const { showToast } = useToast();
  const downloadTaskListFile = useCallback(
    async (exportType: ExportType) => {
      try {
        const now = new Date();
        const dateText = `${now.getFullYear()}${String(
          now.getMonth() + 1,
        ).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
        const sanitizeFilePart = (value: string): string =>
          value.replace(/[\\/:*?"<>|]+/g, '_');

        const params = new URLSearchParams();

        if (filter?.fromDate)
          params.append('from_date', String(filter.fromDate));
        if (filter?.endDate) params.append('end_date', String(filter.endDate));
        if (filter?.largeCategoryId)
          params.append('large_category_id', String(filter.largeCategoryId));
        if (filter?.mediumCategoryId)
          params.append('medium_category_id', String(filter.mediumCategoryId));
        if (filter?.smallCategoryId)
          params.append('small_category_id', String(filter.smallCategoryId));
        if (filter?.organizationId)
          params.append('organization_id', filter.organizationId);
        if (filter?.organizationIds)
          params.append('organization_ids', filter.organizationIds);
        if (filter?.tagIds?.length)
          params.append(
            'tag_ids',
            filter.tagIds.map((item) => item.value).join(','),
          );
        if (filter?.totalDuration)
          params.append('total_duration', String(filter.totalDuration));
        if (filter?.ordering)
          params.append('ordering', String(filter.ordering));
        if (filter?.user_id) params.append('user_id', String(filter.user_id));
        if (is_tag_page) params.append('is_tag_page', String(is_tag_page));
        if (isTeam) params.append('current_screen', 'teamdock');
        if (filter?.user_ids?.length) {
          params.append(
            'user_ids',
            filter.user_ids.map((item) => item.value).join(','),
          );
        }
        if (filter?.uids) {
          params.append('uids', String(filter.uids));
        }
        if (filter?.isCompare) {
          params.append(
            'period_classification',
            PeriodClassification.COMPARISON,
          );
        } else {
          params.append('period_classification', PeriodClassification.BASE);
        }

        params.append('export_type', exportType);

        const apiUrl = `${apiRouters.STATISTICS_TASKS}?${params.toString()}`;

        const response = await api.get(apiUrl, {
          headers: {
            Authorization: `Bearer ${session?.accessToken}`,
          },
          responseType: 'blob',
        });

        const selectedUserIdsFromUids = filter?.uids
          ? filter.uids
              .split(',')
              .map((id) => String(id).trim())
              .filter(Boolean)
          : [];

        const isSingleUserSelected =
          isTeam && selectedUserIdsFromUids.length === 1;
        const singleUserLabel = isSingleUserSelected
          ? filter?.singleUserLabel
          : undefined;

        const nonTeamFileName = `${dateText}_タスク一覧集計_${sanitizeFilePart(
          String(session?.user?.profile.fullName ?? ''),
        )}`;

        const defaultFileName = isTeam
          ? isSingleUserSelected
            ? `${dateText}_タスク一覧集計_${sanitizeFilePart(
                String(
                  singleUserLabel ?? filter?.organizationLabel ?? 'チーム',
                ),
              )}`
            : `${dateText}_タスク一覧集計_${sanitizeFilePart(
                String(filter?.organizationLabel ?? 'チーム'),
              )}`
          : nonTeamFileName;

        handleFileDownload(
          response,
          defaultFileName || `${dateText}_タスク一覧集計`,
          exportType,
          false,
        );

        showToast({
          description: SUCCESS_EXPORT_MESSAGE,
          variant: 'success',
        });
      } catch (err) {
        showToast({
          variant: 'error',
          description: ERROR_FILE_DOWNLOAD,
        });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filter, isTeam, is_tag_page, session?.accessToken, session?.user?.profile],
  );

  return { downloadTaskListFile };
};
