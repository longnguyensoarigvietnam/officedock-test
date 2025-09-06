'use client';
import {
  ChangeEvent,
  Dispatch,
  SetStateAction,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { Controller, SubmitHandler, useForm } from 'react-hook-form';

import Button from '@components/common/Button';
import Input from '@components/common/Input';
import ImageRound from '@components/common/ImageRound';
import Drawer from '@components/common/Drawers';
import GroupIconWithDynamicColor from '@components/common/GroupIcon';
import DatePickerCustom from '@components/common/DatePicker/DatePickerCustom';
import Checkbox from '@components/common/Checkbox';
import ErrorMessage from '@components/common/ErrorMessage';
import CustomUserAvatar from '@components/common/AvatarIcon/CustomUserAvatar';

import { ActionsModal, EventParticipantType } from '@constants/enums';
import { PLEASE_SELECT_AT_LEAST_ONE_CANDIDATE } from '@constants/message';
import {
  NO_OPTIONS,
  VOTING_BONUS_POINT,
  VOTING_TITLE_MAX_LENGTH,
} from '@constants';

import {
  convertDateToStartDate,
  convertToTimeString,
  formatShowDateJapanese,
  formatTimeInputCustom,
  getFilteredTimeOptions,
} from '@utils/date';
import { showModalHeaderBackgroundColorByTime } from '@utils';

import useCreationDataCommon from '@hooks/common/useCreationDataCommon';

import { VotingDetail, VotingFormData } from '@interfaces/mvp';
import { EventParticipant } from '@interfaces/calendar';
import { Profile } from '@interfaces/user';

import { useSessionCache } from '@providers/SessionCacheProvider';

export type ActionsVotingModalProps = {
  open: boolean;
  dataVoting?: VotingDetail | null;
  votingDateTimeErrorMsg: string | null;
  setVotingDateTimeErrorMsg: Dispatch<SetStateAction<string | null>>;
  action?: string | null;
  onDelete?: (values: VotingDetail) => void;
  onClose: () => void;
  onCreate?: (values: VotingFormData) => void;
  onEdit?: (values: VotingFormData) => void;
};

const ActionsVotingModal = ({
  open,
  dataVoting,
  votingDateTimeErrorMsg,
  setVotingDateTimeErrorMsg,
  action = ActionsModal.CREATE,
  onClose,
  onEdit,
  onDelete,
  onCreate,
}: ActionsVotingModalProps) => {
  const { data: session } = useSessionCache();
  const [showMembersErrorMessage, setShowMembersErrorMessage] = useState<
    string | null
  >('');

  // Member tab
  const [activeTab, setActiveTab] = useState<EventParticipantType>(
    EventParticipantType.ORGANIZATION,
  );

  // Search and filter
  const [searchName, setSearchName] = useState<string>('');

  // Get creation data for organizations, members
  const [dashboardMemberList, setDashboardMemberList] = useState<Profile[]>([]);
  const [dataOptionsParticipants, setDataOptionsParticipants] = useState<
    EventParticipant[]
  >([]);

  useCreationDataCommon({
    options: {
      get_all_members: true,
      get_organization_with_users: true,
    },
    onSuccess: (data) => {
      let eventMembers: EventParticipant[] = [];
      let eventOrganizations: EventParticipant[] = [];
      if (data.allMembers) {
        eventMembers = data.allMembers?.map((member) => ({
          id: `${EventParticipantType.USER}-${member.id}`,
          fullName: member.fullName,
          type: EventParticipantType.USER,
          mainOrganization: member.organizations
            ? member.organizations.name
            : '',
          color: member?.avatarColor || '',
          avatarUrl: member?.avatar || '',
        }));

        setDashboardMemberList(data.allMembers);
      }

      if (data.organizationUsers) {
        eventOrganizations = data.organizationUsers
          ? data.organizationUsers.map((org) => ({
              id: `${EventParticipantType.ORGANIZATION}-${org.id}`,
              fullName: org.name,
              type: EventParticipantType.ORGANIZATION,
              userIds: org.users ? org.users.map((user) => user.id) : [],
              color: org.iconColor || '#0068B6',
            }))
          : [];
      }
      setDataOptionsParticipants([...eventOrganizations, ...eventMembers]);
    },
  });

  const {
    register,
    control,
    watch,
    setValue,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<VotingFormData>({
    mode: 'onSubmit',
  });

  const defaultValues = useMemo<VotingFormData>(() => {
    const value: VotingFormData = {
      id: '',
      title: '',
      selectedOrganizations: [],
      candidateIds: [],
      bonusPoint: '',
      endDate: null,
      endTime: '',
      isStart: false,
    };
    if (dataVoting) {
      (value.id = `${dataVoting.id}`),
        (value.title = `${dataVoting.title}`),
        (value.selectedOrganizations = dataVoting.selectedOrganizations
          ? dataVoting.selectedOrganizations
              .split(',')
              .map((org) => Number(org))
          : []),
        (value.candidateIds = dataVoting.candidates.map(
          (candidate) => candidate.id,
        )),
        (value.bonusPoint = dataVoting.bonusPoint),
        (value.endDate = dataVoting.endDate
          ? new Date(
              convertDateToStartDate(
                new Date(`${dataVoting.endDate}`).toISOString(),
              ),
            )
          : null),
        (value.endTime = dataVoting.endDate
          ? convertToTimeString(`${dataVoting.endDate}`)
          : null),
        (value.isStart = dataVoting.isStart);
    }
    return value;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataVoting]);
  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  const onSubmitData: SubmitHandler<VotingFormData> = async (data) => {
    if (
      data.candidateIds.length == 0 &&
      data.selectedOrganizations.length == 0
    ) {
      setShowMembersErrorMessage(PLEASE_SELECT_AT_LEAST_ONE_CANDIDATE);
      return;
    }
    if (action === ActionsModal.CREATE) {
      onCreate && onCreate(data as VotingFormData);
    }
    if (action === ActionsModal.EDIT) {
      onEdit && onEdit(data as VotingFormData);
    }
  };

  const handleDeleteVoting = () => {
    onDelete && onDelete(dataVoting as VotingDetail);
  };

  const handleCloseModal = () => {
    onClose();
  };

  const handleChange = (
    e: ChangeEvent<HTMLInputElement>,
    field: keyof VotingFormData,
  ): void => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 4) {
      value = value.substring(0, 4);
    }
    setValue(field, value);
  };

  const checkIsParticipantSelected = (member: EventParticipant) => {
    const memberId = Number(String(member.id).split('-')[1]);
    if (member.type === EventParticipantType.USER) {
      const selectedUserIds = watch('candidateIds') ?? [];
      return selectedUserIds.includes(memberId);
    } else {
      const selectedOrgIds = watch('selectedOrganizations') ?? [];
      return selectedOrgIds.includes(memberId);
    }
  };
  const handleSelectEventParticipant = (member: EventParticipant) => {
    setShowMembersErrorMessage(null);
    const isUser = member.type === EventParticipantType.USER;
    const isOrganization = member.type === EventParticipantType.ORGANIZATION;
    const currentParticipantList = watch('candidateIds') || [];
    const currentOrganizationList = watch('selectedOrganizations') || [];
    const memberId = Number(String(member.id).split('-')[1]);

    let updatedParticipantList = [...currentParticipantList];
    let updatedOrganizationList = [...currentOrganizationList];

    if (isUser) {
      const isAlreadySelected = currentParticipantList.includes(memberId);

      if (isAlreadySelected) {
        // Remove the user
        updatedParticipantList = updatedParticipantList.filter(
          (id) => id !== memberId,
        );

        // Remove any org that includes the removed user
        const belongedOrganizations = dataOptionsParticipants
          .filter(
            (participant) =>
              participant.type == EventParticipantType.ORGANIZATION &&
              participant.userIds?.includes(memberId),
          )
          .map((org) => Number(String(org.id).split('-')[1]));

        updatedOrganizationList = updatedOrganizationList.filter(
          (org) => !belongedOrganizations.includes(org),
        );
      } else {
        updatedParticipantList.push(memberId);
      }

      setValue('candidateIds', updatedParticipantList, { shouldDirty: true });
      setValue('selectedOrganizations', updatedOrganizationList, {
        shouldDirty: true,
      });
    } else if (isOrganization) {
      const isAlreadySelected = currentOrganizationList.includes(memberId);
      const organizationMembers = member.userIds || [];

      if (isAlreadySelected) {
        updatedOrganizationList = updatedOrganizationList.filter(
          (id) => id !== memberId,
        );
        // Collect member IDs that should be removed (if not in any other selected org)
        const removeMemberIds = organizationMembers.filter((memberId) => {
          return !updatedOrganizationList.some((orgId) => {
            const org = dataOptionsParticipants.find(
              (item) =>
                Number(item.id) === orgId &&
                item.type === EventParticipantType.ORGANIZATION,
            );
            return org?.userIds?.includes(memberId);
          });
        });

        // Remove the filtered member IDs from selected users
        updatedParticipantList = updatedParticipantList.filter(
          (id) => !removeMemberIds.includes(id),
        );
      } else {
        updatedOrganizationList.push(memberId);
        updatedParticipantList = Array.from(
          new Set([...updatedParticipantList, ...organizationMembers]),
        );
      }

      setValue('selectedOrganizations', updatedOrganizationList, {
        shouldDirty: true,
      });
      setValue('candidateIds', updatedParticipantList, { shouldDirty: true });
    }
  };

  // Render avatar for users and organizations
  const renderAvatar = (memberId: string) => {
    const actualMemberId = Number(memberId.split('-')[1]);
    const memberInfo = dashboardMemberList.find(
      (memberWithAvatar) => memberWithAvatar.id == actualMemberId,
    );

    return (
      <div className="min-w-[30px] min-h-[30px]">
        <CustomUserAvatar
          avatarUrl={memberInfo?.avatar || ''}
          avatarColor={memberInfo?.avatarColor || ''}
          size={30}
        />
      </div>
    );
  };

  return (
    <Drawer
      open={open}
      className="font-primary bg-white w-[700px] !px-0 !rounded-l-[30px]"
      onClose={handleCloseModal}>
      <header
        className="px-8 rounded-tl-[30px] h-[50px] flex items-center justify-between"
        style={{
          background: showModalHeaderBackgroundColorByTime(),
        }}>
        <div className="flex text-sm items-center gap-4 text-white">
          <p className="">
            登録日{' '}
            {action === ActionsModal.EDIT && dataVoting?.createdAt
              ? formatShowDateJapanese(dataVoting.createdAt)
              : formatShowDateJapanese(new Date())}
          </p>
        </div>
        <div className="flex gap-5 items-center">
          <ImageRound
            className="mt-1 w-[14px] h-[17px] hover:cursor-pointer"
            src="/icons/delete-event.svg"
            name="Delete icon"
            onClick={handleDeleteVoting}
          />

          <ImageRound
            className="mt-1 w-3 h-[14px] hover:cursor-pointer"
            src="/icons/drawer-close-white.svg"
            name="Close icon"
            onClick={() => {
              reset();
              onClose();
            }}
          />
        </div>
      </header>
      <form
        onSubmit={handleSubmit(onSubmitData)}
        className="px-8 pb-8 !h-[calc(100vh_-_150px)] overflow-y-auto">
        <header className="flex sticky z-[100] top-[0px] py-5 items-start gap-2 justify-between bg-white !w-full">
          <div className="w-full">
            <Input
              className={`shadow-none !w-[calc(100%)] text-2xl leading-[56px] font-bold !pl-3 flex items-center !py-0 h-[42px] focus:!shadow-none focus:border ${errors.title ? '!border-error' : '!border-[#77858F]'}  !border-[1px] rounded-md`}
              register={register('title', {
                maxLength: VOTING_TITLE_MAX_LENGTH,
              })}
              placeholder="タイトルを入力"
              error={errors.title?.message}
            />
            <p
              className={`text-[13px] mt-[6px] flex justify-end ${Number(watch('title')?.length) > VOTING_TITLE_MAX_LENGTH ? 'text-error' : 'text-black'}`}>
              {watch('title')?.length || 0}/{VOTING_TITLE_MAX_LENGTH}字
            </p>
          </div>
          <div className="flex gap-2 items-center mt-[3px]">
            <Button
              type="submit"
              className="w-[82px] h-[36px] !text-[12px] !px-2">
              保存
            </Button>
            <Button
              variant="outline"
              type="button"
              onClick={onClose}
              className="w-[82px] !rounded-md  h-[34px] !text-[12px] !px-2">
              キャンセル
            </Button>
          </div>
        </header>
        {/* Candidate */}
        <div className="flex justify-between items-start mb-[30px]">
          <p className="w-fit font-medium text-[14px] mt-3">候補メンバー</p>
          <div className="w-[513px]">
            <div className="relative">
              <Input
                placeholder="名前を検索"
                className={`!w-[513px] h-[34px] pl-9 focus:!shadow-none !border-[1px] !border-[#77858F] !rounded-md`}
                onChange={(e) => setSearchName(e.target.value)}
              />
              <ImageRound
                src="/icons/search.svg"
                name="Search input icon"
                className={`absolute w-4 h-4 ml-3 top-[11px]`}
              />
            </div>

            <div className="flex gap-6 items-center my-[10px] py-[10px]">
              <p
                className="text-[#77858F] font-medium text-xs hover:cursor-pointer"
                onClick={() => {
                  setShowMembersErrorMessage(null);
                  const updatedParticipantList =
                    dataOptionsParticipants?.filter((member) =>
                      member.fullName
                        .toLowerCase()
                        .includes(searchName.toLowerCase()),
                    );
                  setValue(
                    'candidateIds',
                    [
                      ...(watch('candidateIds') || []),
                      ...updatedParticipantList
                        .filter(
                          (participant) =>
                            participant.type === EventParticipantType.USER,
                        )
                        .map((participant) =>
                          Number(String(participant.id).split('-')[1]),
                        ),
                    ],
                    { shouldDirty: true },
                  );

                  setValue(
                    'selectedOrganizations',
                    [
                      ...(watch('selectedOrganizations') || []),
                      ...updatedParticipantList
                        .filter(
                          (participant) =>
                            participant.type ==
                            EventParticipantType.ORGANIZATION,
                        )
                        .map((participant) =>
                          Number(String(participant.id).split('-')[1]),
                        ),
                    ],
                    { shouldDirty: true },
                  );
                }}>
                全てをチェック
              </p>
              <p
                className="text-[#77858F] font-medium text-xs hover:cursor-pointer"
                onClick={() => {
                  setShowMembersErrorMessage(null);
                  const matchingParticipantList =
                    dataOptionsParticipants?.filter((member) =>
                      member.fullName
                        .toLowerCase()
                        .includes(searchName.toLowerCase()),
                    );
                  const currentParticipantIds = watch('candidateIds') || [];
                  const currentOrganizationIds =
                    watch('selectedOrganizations') || [];

                  const filteredParticipantIds = currentParticipantIds.filter(
                    (participantId) =>
                      !matchingParticipantList.find(
                        (matchingParticipant) =>
                          String(matchingParticipant.id).split('-')[1] ===
                            String(participantId) &&
                          matchingParticipant.type == EventParticipantType.USER,
                      ),
                  );
                  const filteredOrganizationIds = currentOrganizationIds.filter(
                    (participantId) =>
                      !matchingParticipantList.find(
                        (matchingParticipant) =>
                          String(matchingParticipant.id).split('-')[1] ===
                            String(participantId) &&
                          matchingParticipant.type ==
                            EventParticipantType.ORGANIZATION,
                      ),
                  );

                  setValue('candidateIds', filteredParticipantIds, {
                    shouldDirty: true,
                  });

                  setValue('selectedOrganizations', filteredOrganizationIds, {
                    shouldDirty: true,
                  });
                }}>
                全てのチェックをクリア
              </p>
            </div>
            <div className="w-[513px] flex gap-2 bg-[#EBF1F7] px-[6px] py-[4px] rounded-[20px] mb-[10px]">
              <Button
                type="button"
                variant={`${activeTab == EventParticipantType.ORGANIZATION ? 'secondary' : 'outline'}`}
                className={`w-[253px] !p-0 text-xs h-[24px] !font-bold ${activeTab == EventParticipantType.ORGANIZATION ? 'text-white !bg-[#3CABF3]' : '!text-[#77858F] !bg-[#EBF1F7]'} border-none !rounded-[20px]`}
                onClick={() => setActiveTab(EventParticipantType.ORGANIZATION)}>
                チーム
              </Button>
              <Button
                type="button"
                variant={`${activeTab == EventParticipantType.USER ? 'secondary' : 'outline'}`}
                className={`w-[253px] !p-0 text-xs h-[24px] !font-bold ${activeTab == EventParticipantType.USER ? 'text-white !bg-[#3CABF3]' : '!text-[#77858F] !bg-[#EBF1F7]'} border-none !rounded-[20px]`}
                onClick={() => setActiveTab(EventParticipantType.USER)}>
                メンバー
              </Button>
            </div>
            <div className="max-h-[255px] overflow-y-auto overflow-x-hidden scrollbar-gutter-stable">
              {dataOptionsParticipants?.filter((member) =>
                member.fullName
                  .toLowerCase()
                  .includes(searchName.toLowerCase()),
              ).length === 0 && (
                <p className="text-gray-500 text-center text-sm">
                  {NO_OPTIONS}
                </p>
              )}

              {dataOptionsParticipants
                ?.filter((member) =>
                  member.fullName
                    .toLowerCase()
                    .includes(searchName.toLowerCase()),
                )
                ?.filter((member) =>
                  activeTab == EventParticipantType.ORGANIZATION
                    ? member.type == EventParticipantType.ORGANIZATION
                    : member.type == EventParticipantType.USER,
                )
                .sort((prev: EventParticipant, next: EventParticipant) => {
                  const prevSelected = checkIsParticipantSelected(prev);
                  const nextSelected = checkIsParticipantSelected(next);

                  // 1. Checked participants first
                  if (prevSelected !== nextSelected) {
                    return prevSelected ? -1 : 1;
                  }

                  // 2. Current user (only if user, not org)
                  if (
                    prev.id === session?.user.id &&
                    prev.type === EventParticipantType.USER
                  )
                    return -1;
                  if (
                    next.id === session?.user.id &&
                    next.type === EventParticipantType.USER
                  )
                    return 1;

                  // 3. Organizations before users
                  if (
                    prev.type === EventParticipantType.ORGANIZATION &&
                    next.type === EventParticipantType.USER
                  )
                    return -1;
                  if (
                    prev.type === EventParticipantType.USER &&
                    next.type === EventParticipantType.ORGANIZATION
                  )
                    return 1;

                  // 4. Alphabetical
                  return prev.fullName.localeCompare(next.fullName);
                })
                .map((member) => {
                  return (
                    <div
                      className={`flex gap-2 items-center px-3 py-2.5 hover:cursor-pointer ${
                        checkIsParticipantSelected(member) && 'bg-[#EBF1F7]'
                      }`}
                      key={member.id}>
                      <div>
                        <Checkbox
                          isChecked={checkIsParticipantSelected(member)}
                          onChange={() => {
                            handleSelectEventParticipant(member);
                          }}
                        />
                      </div>
                      {member.type == EventParticipantType.USER && (
                        <>{renderAvatar(String(member.id))}</>
                      )}
                      {member.type == EventParticipantType.ORGANIZATION && (
                        <div className="scale-110">
                          <GroupIconWithDynamicColor
                            color={member.color || '#0068B6'}
                          />
                        </div>
                      )}
                      <div className="!w-full">
                        <p className="line-clamp-3 break-all font-medium text-[15px] text-black">
                          {member.fullName}
                          <span className="text-[#77858F] text-xs ml-1">
                            {member.mainOrganization}
                          </span>
                        </p>
                      </div>
                    </div>
                  );
                })}
            </div>
            {showMembersErrorMessage ? (
              <ErrorMessage
                error={showMembersErrorMessage}
                className="text-xs mt-3"
              />
            ) : (
              <></>
            )}
          </div>
        </div>

        {/* Bonus point */}
        <div className="flex justify-between items-center mb-[30px]">
          <p className="w-fit font-medium text-[14px]">贈呈コイン</p>
          <div className="w-[513px]">
            <p className="text-sm">{VOTING_BONUS_POINT}</p>
          </div>
        </div>

        {/* End date */}
        <div className="flex justify-between items-center mb-[44px]">
          <p className="w-fit font-medium text-[14px]">終了日時</p>
          <div className="w-[513px]">
            <div className="flex items-center gap-2 w-[513px]">
              <div className="w-[156px]">
                <Controller
                  control={control}
                  name="endDate"
                  rules={{
                    required: watch('endTime') ? true : false,
                  }}
                  render={({ field: { value, onChange } }) => (
                    <DatePickerCustom
                      minDate={new Date()}
                      className="h-[34px] !px-2 !pl-[30px] !border-[1px] !border-[#77858F] rounded-md !text-xs !pt-2 text-center"
                      selected={value ? new Date(value) : null}
                      onChange={(e) => {
                        setVotingDateTimeErrorMsg(null);
                        onChange(e);
                      }}
                    />
                  )}
                />
              </div>

              <div className="w-[77px] z-40">
                <Input
                  isShowClockIcon={true}
                  register={register('endTime', {
                    required: watch('endDate') !== null ? true : false,
                    onChange: (e) => {
                      setVotingDateTimeErrorMsg(null);
                      handleChange(e, 'endTime');
                    },
                    onBlur: (time) => {
                      const formatted = formatTimeInputCustom(
                        time.target.value,
                      );

                      setValue('endTime', formatted);
                    },
                  })}
                  type="text"
                  className={`h-[34px] !text-xs !pr-1 !pl-7 !border-[1px] ${votingDateTimeErrorMsg ? '!border-error' : '!border-[#77858F]'}  rounded-md`}
                  options={getFilteredTimeOptions(
                    new Date(watch('endDate') ?? new Date()),
                  )}
                  onChangeDropdown={(e) => {
                    setVotingDateTimeErrorMsg(null);
                    setValue('endTime', e.label, {
                      shouldDirty: true,
                    });
                  }}
                />
              </div>
            </div>
            {votingDateTimeErrorMsg && (
              <ErrorMessage
                error={votingDateTimeErrorMsg}
                className="text-xs mt-1"
              />
            )}
          </div>
        </div>

        <div className="flex justify-center mb-[50px]">
          <Button type="submit" className="w-[200px] h-[46px] !text-[15px]">
            保存
          </Button>
        </div>
      </form>
    </Drawer>
  );
};

export default ActionsVotingModal;
