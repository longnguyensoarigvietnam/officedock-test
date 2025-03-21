import React, { useContext, useState } from 'react';
import Tippy from '@tippyjs/react';

import AvatarIconWithDynamicColor from '@components/common/AvatarIcon';
import ImageRound from '@components/common/ImageRound';
import StatusColumn from './StatusColumn';

import { TransformedStatuses, TransformedUser } from '@interfaces/task';
import { getRandomColor } from '@utils';
import { TaskTeamStateContext } from '@providers/TaskTeamProvider';

type Props = {
  user: TransformedUser;
};
const statuses: (keyof TransformedStatuses)[] = [
  'NOT_STARTED',
  'IN_PROGRESS',
  'CONFIRMING',
  'COMPLETED',
];

const UserColumnTeam = ({ user }: Props) => {
  const { columnWidth } = useContext(TaskTeamStateContext);
  const [isExtendUser, setIsExtendUser] = useState(true);
  const userColor = getRandomColor();
  return (
    <>
      {isExtendUser ? (
        <div
          style={{
            width: `${(columnWidth / 247) * 247}px`,
          }}>
          <div
            style={{
              width: `${(columnWidth / 247) * 247}px`,
              paddingRight: `${(columnWidth / 247) * 10}px`,
            }}
            className="flex justify-between ">
            <div
              style={{
                gap: `${(columnWidth / 247) * 10}px`,
                fontSize: `${(columnWidth / 247) * 15}px`,
              }}
              className="flex items-center gap-[10px] font-medium text-[15px] ">
              <AvatarIconWithDynamicColor
                color={userColor}
                size={(columnWidth / 247) * 33}
              />
              <p
                style={{
                  maxWidth: `${(columnWidth / 247) * 128}px`,
                  top: `${(columnWidth / 247) * 2}px`,
                }}
                className="truncate relative ">
                {user.name}
              </p>
            </div>
            <div
              style={{
                gap: `${(columnWidth / 247) * 10}px`,
              }}
              className="flex items-center">
              <Tippy
                content="タスクを新規作成"
                arrow={false}
                delay={1000}
                placement="top"
                offset={[0, 5]}>
                <div
                  style={{
                    padding: '5px',
                  }}
                  className={`rounded-full cursor-pointer w-fit bg-white `}
                  onClick={() => {}}>
                  <ImageRound
                    src={`/icons/add.svg`}
                    name="Add"
                    style={{
                      width: `${(columnWidth / 247) * 9}px`,
                      height: `${(columnWidth / 247) * 9}px`,
                    }}
                  />
                </div>
              </Tippy>
              <Tippy
                content="タブを縮小"
                arrow={false}
                delay={1000}
                placement="top"
                offset={[0, 5]}>
                <div onClick={() => setIsExtendUser(false)}>
                  <ImageRound
                    src={`/icons/extend-column.svg`}
                    className={`${isExtendUser ? 'rotate-0' : 'rotate-180'} cursor-pointer`}
                    name="extend"
                    style={{
                      width: `8px`,
                      height: `12px`,
                    }}
                  />
                </div>
              </Tippy>
            </div>
          </div>
          <div className="flex flex-col gap-2 mt-[14px]">
            {statuses.map((status) => (
              <StatusColumn
                key={`${user.id}-${status}`}
                status={status}
                user={user}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="w-[80px] pt-[6px]">
          <div className="flex gap-[6px] items-center justify-center">
            <AvatarIconWithDynamicColor color={userColor} size={33} />

            <Tippy
              content="タブを拡大"
              arrow={false}
              delay={1000}
              placement="top"
              offset={[0, 5]}>
              <div
                onClick={() => setIsExtendUser(true)}
                style={{
                  padding: `${(247 / 247) * 0}px`,
                  paddingLeft: `${(247 / 247) * 12}px`,
                }}>
                <ImageRound
                  src={`/icons/extend-column.svg`}
                  className={`${isExtendUser ? 'rotate-0' : 'rotate-180'} cursor-pointer`}
                  name="extend"
                  style={{
                    width: `8px`,
                    height: `12px`,
                  }}
                />
              </div>
            </Tippy>
          </div>
          <div
            style={{
              marginBottom: `${(247 / 247) * 14}px`,
              marginTop: `${(247 / 247) * 14}px`,
            }}>
            <p
              style={{
                fontSize: `14px`,
              }}
              className="text-[#77858F] w-full text-center text-sm">
              10
            </p>
          </div>
          <div className="w-full flex justify-center">
            <div className={`w-2 h-[650px] bg-[#DEE8EE]`}></div>
          </div>
        </div>
      )}
    </>
  );
};

export default UserColumnTeam;
