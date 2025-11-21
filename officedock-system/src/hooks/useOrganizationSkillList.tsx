'use client';

import { useContext } from 'react';
import { useQuery } from 'react-query';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

import { LoadingContext } from '@providers/LoadingProvider';
import { useSessionCache } from '@providers/SessionCacheProvider';

import { apiRouters, pageRouters } from '@constants/routers';
import { ScreenName, ServerStatusCode } from '@constants/enums';

import { ResponseError } from '@interfaces/response';
import { OrganizationSkill, SkillMapSkill } from '@interfaces/skills';

import api from '@base/api';

interface FilterProps {
  filterOrganizationIds?: number;
  filterSteps?: string;
  organizationId?: number;
  screen?: string;
  is_deleted?: string;
}

const useOrganizationSkillList = ({
  filter,
  showLoadingIndicator = false,
}: {
  filter?: FilterProps;
  showLoadingIndicator?: boolean;
}) => {
  const { data: session } = useSessionCache();
  const router = useRouter();
  const token = session?.accessToken;

  const { setIsLoading } = useContext(LoadingContext);

  // Handle call API get organization skill list
  const getOrganizationSkillList = async () => {
    showLoadingIndicator && setIsLoading(true);
    const queryParams = [];

    if (filter?.filterOrganizationIds) {
      queryParams.push(
        `filter_organization_ids=${filter.filterOrganizationIds}`,
      );
    }
    if (filter?.filterSteps) {
      queryParams.push(`filter_steps=${filter.filterSteps}`);
    }
    if (filter?.organizationId) {
      queryParams.push(`organization_id=${filter.organizationId}`);
    }
    if (filter?.screen) {
      queryParams.push(`screen=${filter.screen}`);
    }
    if (filter?.is_deleted) {
      queryParams.push(`is_deleted=${filter?.is_deleted}`);
    }

    const queryString =
      queryParams.length > 0 ? `?${queryParams.join('&')}` : '';

    // TODO: Confirm with BE about how many and how to use param
    const apiUrl = `${apiRouters.SKILL_LIST}${queryString}`;

    if (filter?.screen && filter.screen == ScreenName.SKILL_MAP) {
      const { data } = await api.get<SkillMapSkill[]>(apiUrl);
      return data;
    } else {
      const { data } = await api.get<OrganizationSkill[]>(apiUrl);
      return data;
    }
  };

  // Handle API get organization skill list
  const {
    data: organizationSkillList,
    refetch: refetchOrganizationSkillList,
    isFetched: isFetchedOrganizationSkill,
  } = useQuery({
    queryKey: ['getOrganizationSkillList', [filter]],
    queryFn: getOrganizationSkillList,
    retry: 0,
    enabled: !!token,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    onError: ({ response }: ResponseError<any>) => {
      if (response?.status === ServerStatusCode.UNAUTHORIZED) {
        if (session) {
          signOut();
          router.push(pageRouters.LOGIN.href);
        }
      }
    },
    onSettled: () => {
      showLoadingIndicator && setIsLoading(false);
    },
  });

  return {
    organizationSkillList,
    refetchOrganizationSkillList,
    isFetchedOrganizationSkill,
  };
};

export default useOrganizationSkillList;
