import { Dispatch, SetStateAction } from 'react';

import Pagination from '@components/common/Pagination';
import { Table, TableBody, TableHeader } from '@components/common/Table';

import { NO_DATA_AVAILABLE } from '@constants/message';

import { CompanyTransaction } from '@interfaces/company';

import { formatJapaneseDateRange } from '@utils';

interface UsageHistoryProps {
  setCurrentPlanTransactionPage: Dispatch<SetStateAction<number>>;
  currentPlanTransactionPage: number;
  planList: CompanyTransaction[];
  totalPlanTransactionPages: number;
}

export const UsageHistory = ({
  planList,
  currentPlanTransactionPage,
  totalPlanTransactionPages,
  setCurrentPlanTransactionPage,
}: UsageHistoryProps) => {
  return (
    <div className="w-full flex flex-col gap-5 bg-white shadow-common rounded-lg p-4">
      {/* Header */}
      <section>
        <p className="text-lg font-bold border-b-[1px] pb-2 border-gray-200">
          利用履歴
        </p>
      </section>
      {/* Body */}
      <section className="flex flex-col gap-4">
        <p>利用プランの履歴</p>
        <div className="w-full">
          <Table className="bg-white !rounded-lg ">
            <TableHeader>
              <th className="text-left w-1/2">期間</th>
              <th className="text-left w-1/2">プラン名</th>
            </TableHeader>
            <TableBody>
              {planList && planList.length ? (
                planList.map((plan, index) => (
                  <tr key={index}>
                    <td className="text-left w-1/2 truncate">
                      {formatJapaneseDateRange(
                        plan.planStartAt,
                        plan.planEndAt,
                      )}
                    </td>
                    <td className="text-left w-1/2 truncate">{plan.plan}</td>
                  </tr>
                ))
              ) : (
                <tr className="relative py-5 text-center text-sm leading-6">
                  <td className="h-16" />
                  <td className="absolute top-1/2 left-1/2 whitespace-nowrap transform -translate-x-1/2 -translate-y-1/2 py-5 text-center">
                    {NO_DATA_AVAILABLE}
                  </td>
                </tr>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="flex justify-center">
          {planList && planList.length ? (
            <Pagination
              onChange={(pageNumber) =>
                setCurrentPlanTransactionPage(pageNumber)
              }
              currentPage={currentPlanTransactionPage}
              totalPages={totalPlanTransactionPages}
            />
          ) : null}
        </div>
      </section>
    </div>
  );
};
