'use client';

import { Fragment } from 'react';

import ImageRound from '@components/common/ImageRound';
import RangeSlider from '@components/common/Slider';
import { Table, TableBody, TableHeader } from '@components/common/Table';

import useAuthenticatedUser from '@hooks/useAuthenticatedUser';

const SkillMap = () => {
  const { authenticatedUser } = useAuthenticatedUser();
  return (
    <Fragment>
      <div className="flex items-center mb-5">
        <ImageRound
          className="w-24 h-24"
          src="/images/avatar-default.svg"
          border="full"
          name="Avatar user"
        />
        <div className="ml-5">
          <div className="flex gap-3 items-center">
            <p className="font-normal text-2xl mb-2 truncate max-w-[300px]">
              {authenticatedUser?.profile.fullName}
            </p>
            <ImageRound
              className="w-9 h-9"
              src="/icons/pajamas-smile.svg"
              border="full"
              name="Pajamas smile"
            />
          </div>
          <div className=" flex gap-1 font-normal text-lg">
            <p className="truncate max-w-[500px]">
              {authenticatedUser?.organizations &&
                authenticatedUser?.organizations.map((organization, index) => (
                  <span
                    key={
                      organization.id
                    }>{`${organization.name}${authenticatedUser?.organizations && authenticatedUser?.organizations.length - 1 !== index ? '、' : ''}`}</span>
                ))}
            </p>{' '}
          </div>
        </div>
        <div className="ml-64">
          <p className="font-normal text-lg mb-2 ">レベルの説明</p>
          <p className="font-normal text-lg mb-2 ">ポイントの付与の説明</p>
        </div>
      </div>
      <div>
        <Table className="">
          <TableHeader>
            <th className="font-normal">
              <span className="text-sm">大カテゴリー</span>
            </th>
            <th className="font-normal">
              <span className="text-sm">中カテゴリー</span>
            </th>
            <th className="font-normal">
              <span className="text-sm">小カテゴリー</span>
            </th>
            <th className="font-normal !px-1 level-width">
              <div className=" flex items-center justify-center py-2 gap-2">
                <p className="text-sm">レベル1</p>
                <ImageRound
                  className="w-4 h-4"
                  src="/icons/question-mark.svg"
                  border="full"
                  name="Question mark"
                />
              </div>
            </th>
            <th className="font-normal !px-1">
              <div className=" flex items-center justify-center py-2 gap-2">
                <p className="text-sm">レベル2</p>
                <ImageRound
                  className="w-4 h-4"
                  src="/icons/question-mark.svg"
                  border="full"
                  name="Question mark"
                />
              </div>
            </th>
            <th className="font-normal !px-1">
              <div className=" flex items-center justify-center py-2 gap-2">
                <p className="text-sm">レベル3</p>
                <ImageRound
                  className="w-4 h-4"
                  src="/icons/question-mark.svg"
                  border="full"
                  name="Question mark"
                />
              </div>
            </th>
          </TableHeader>
          <TableBody>
            <tr className="border-[1px] relative">
              <td rowSpan={6} className="border-[1px] py-5 px-8 text-center">
                <span className="text-sm">セミナー・撮影 関係</span>
              </td>
              <td rowSpan={2} className="border-[1px] py-5 px-8 text-center">
                <span className="text-sm">セミナー・撮影準備</span>
              </td>
              <td className="border-[1px] text-center relative">
                <p className="text-sm text-center py-2 px-10">配信素材作成</p>
                <ImageRound
                  className="w-4 h-4 absolute top-2 right-2"
                  src="/icons/question-mark.svg"
                  border="full"
                  name="Question mark"
                />
              </td>
              <td className="border-[1px] py-5 px-8 text-center relative">
                <div className="absolute top-[10px] -left-[0px] transform w-[calc(305%)] h-full overflow-x-hidden">
                  <RangeSlider value={0} />
                </div>
              </td>
              <td className="border-[1px] py-5 px-8 text-center"></td>
              <td className="border-[1px] py-5 px-8 text-center"></td>
            </tr>
            <tr className="border-[1px]">
              <td className="border-[1px] relative">
                <p className="text-sm text-center py-2 px-10">その他</p>
                <ImageRound
                  className="w-4 h-4 absolute top-2 right-2"
                  src="/icons/question-mark.svg"
                  border="full"
                  name="Question mark"
                />
              </td>
              <td className="border-[1px] py-5 px-8 text-center relative">
                <div className="absolute top-[10px] -left-[0px] transform w-[calc(305%)] h-full overflow-x-hidden">
                  <RangeSlider value={0} />
                </div>
              </td>
              <td className="border-[1px] py-5 px-8 text-center"></td>
              <td className="border-[1px] py-5 px-8 text-center"></td>
            </tr>
            <tr className="border-[1px]">
              <td className="border-[1px]">
                <p className="text-sm text-center py-2 px-10">
                  セミナー・撮影当日
                </p>
              </td>
              <td className="border-[1px] py-5 px-8 text-center bg-[#EAF8FF]">
                ー
              </td>
              <td className="border-[1px] py-5 px-8 text-center relative">
                <div className="absolute top-[10px] -left-[0px] transform w-[calc(305%)] h-full overflow-x-hidden">
                  <RangeSlider value={0} />
                </div>
              </td>
              <td className="border-[1px] py-5 px-8 text-center"></td>
              <td className="border-[1px] py-5 px-8 text-center"></td>
            </tr>
            <tr className="border-[1px] py-5 px-8 text-center">
              <td className="border-[1px] py-5 px-8 text-center">
                <p className="text-sm  py-2 px-10">セミナー・撮影後</p>
              </td>
              <td className="border-[1px] py-5 px-8 text-center bg-[#EAF8FF]">
                ー
              </td>
              <td className="border-[1px] py-5 px-8 text-center relative">
                <div className="absolute top-[10px] -left-[0px] transform w-[calc(305%)] h-full overflow-x-hidden">
                  <RangeSlider value={0} />
                </div>
              </td>
              <td className="border-[1px] py-5 px-8 text-center"></td>
              <td className="border-[1px] py-5 px-8 text-center"></td>
            </tr>
            <tr className="border-[1px] py-5 px-8 text-center">
              <td className="border-[1px] ">
                <p className="text-sm py-2 px-10">技術向上</p>
              </td>
              <td className="border-[1px] py-5 px-8 text-center bg-[#EAF8FF]">
                ー
              </td>
              <td className="border-[1px] py-5 px-8 text-center relative">
                <div className="absolute top-[10px] -left-[0px] transform w-[calc(305%)] h-full overflow-x-hidden">
                  <RangeSlider value={0} />
                </div>
              </td>
              <td className="border-[1px] py-5 px-8 text-center"></td>
              <td className="border-[1px] py-5 px-8 text-center"></td>
            </tr>
            <tr className="border-[1px] py-5 px-8 text-center">
              <td className="border-[1px]">
                <p className="text-sm py-2 px-10">その他</p>
              </td>
              <td className="border-[1px] py-5 px-8 text-center bg-[#EAF8FF]">
                ー
              </td>
              <td className="border-[1px] py-5 px-8 text-center relative">
                <div className="absolute top-[10px] -left-[0px] transform w-[calc(305%)] h-full overflow-x-hidden">
                  <RangeSlider value={0} />
                </div>
              </td>
              <td className="border-[1px] py-5 px-8 text-center"></td>
              <td className="border-[1px] py-5 px-8 text-center"></td>
            </tr>
            <tr className="border-[1px]">
              <td rowSpan={5} className="border-[1px] py-5 px-8 text-center">
                <span className="text-sm">教材・動画・印刷物 関係</span>
              </td>
              <td rowSpan={5} className="border-[1px] py-5 px-8 text-center">
                <span className="text-sm">動画編集</span>
              </td>
              <td className="border-[1px] py-5 px-8 text-center relative">
                <p className="text-sm  py-2 px-10">アーカイブ編集</p>
                <ImageRound
                  className="w-4 h-4 absolute top-2 right-2"
                  src="/icons/question-mark.svg"
                  border="full"
                  name="Question mark"
                />
              </td>
              <td className="border-[1px] py-5 px-8 text-center relative">
                <div className="absolute top-[10px] -left-[0px] transform w-[calc(305%)] h-full overflow-x-hidden">
                  <RangeSlider value={0} />
                </div>
              </td>
              <td className="border-[1px] py-5 px-8 text-center"></td>
              <td className="border-[1px] py-5 px-8 text-center"></td>
            </tr>
            <tr className="border-[1px]">
              <td className="border-[1px] py-5 px-8 text-center relative">
                <p className="text-sm  py-2 px-10">講義動画編集</p>
                <ImageRound
                  className="w-4 h-4 absolute top-2 right-2"
                  src="/icons/question-mark.svg"
                  border="full"
                  name="Question mark"
                />
              </td>
              <td className="border-[1px] py-5 px-8 text-center relative">
                <div className="absolute top-[10px] -left-[0px] transform w-[calc(305%)] h-full overflow-x-hidden">
                  <RangeSlider value={0} />
                </div>
              </td>
              <td className="border-[1px] py-5 px-8 text-center"></td>
              <td className="border-[1px] py-5 px-8 text-center"></td>
            </tr>
            <tr className="border-[1px]">
              <td className="border-[1px] py-5 px-8 text-center relative">
                <p className="text-sm  py-2 px-10">Web講習会</p>
                <ImageRound
                  className="w-4 h-4 absolute top-2 right-2"
                  src="/icons/question-mark.svg"
                  border="full"
                  name="Question mark"
                />
              </td>
              <td className="border-[1px] py-5 px-8 text-center relative">
                <div className="absolute top-[10px] -left-[0px] transform w-[calc(305%)] h-full overflow-x-hidden">
                  <RangeSlider value={0} />
                </div>
              </td>
              <td className="border-[1px] py-5 px-8 text-center"></td>
              <td className="border-[1px] py-5 px-8 text-center"></td>
            </tr>
            <tr className="border-[1px]">
              <td className="border-[1px] py-5 px-8 text-center relative">
                <p className="text-sm py-2 px-10">ｅラーニング</p>
                <ImageRound
                  className="w-4 h-4 absolute top-2 right-2"
                  src="/icons/question-mark.svg"
                  border="full"
                  name="Question mark"
                />
              </td>
              <td className="border-[1px] py-5 px-8 text-center relative">
                <div className="absolute top-[10px] -left-[0px] transform w-[calc(305%)] h-full overflow-x-hidden">
                  <RangeSlider value={0} />
                </div>
              </td>
              <td className="border-[1px] py-5 px-8 text-center"></td>
              <td className="border-[1px] py-5 px-8 text-center"></td>
            </tr>
          </TableBody>
        </Table>
      </div>
    </Fragment>
  );
};

export default SkillMap;
