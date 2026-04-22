import { useParams } from 'next/navigation';
import { useState } from 'react';

import Pagination from '@components/common/Pagination';
import { Table, TableBody, TableHeader } from '@components/common/Table';
import ViewInfo from '@components/common/ViewInfo';

import { CompanyTransactionType } from '@constants/enums';
import { NO_DATA_AVAILABLE } from '@constants/message';
import { JAPAN_DATE_FORMAT, JAPAN_YEAR_MONTH_FORMAT } from '@constants';

import useListCompanyTransactions from '@hooks/useListCompanyTransactions';

import { CompanyTransaction } from '@interfaces/company';

import { renderDate } from '@utils';

export const PaymentInformation = ({
  paymentMethod,
}: {
  paymentMethod: string;
}) => {
  const params = useParams<{ id: string }>();
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [invoiceList, setInvoiceList] = useState<CompanyTransaction[]>([]);
  const [totalPages, setTotalPages] = useState<number>(1);

  useListCompanyTransactions({
    page: currentPage,
    filter: {
      id: Number(params.id),
      type: CompanyTransactionType.INVOICE,
    },
    onSuccess: (data) => {
      setInvoiceList(data.results);
      setTotalPages(data.numPages);
    },
  });

  return (
    <div className="w-full flex flex-col gap-5 bg-white shadow-common rounded-lg p-4">
      {/* Header */}
      <section>
        <p className="text-lg font-bold border-b-[1px] pb-2 border-gray-200">
          支払い情報
        </p>
      </section>
      {/* Body */}
      <section className="flex flex-col gap-4">
        <ViewInfo
          label="決済方法"
          labelClassName="font-normal"
          className="flex justify-between items-center">
          {paymentMethod}
        </ViewInfo>
        <p>支払いの状況</p>
        <div className="w-full">
          <Table className="bg-white !rounded-lg ">
            <TableHeader>
              <th className="text-left w-1/3">対象月</th>
              <th className="text-left w-1/3">ステータス</th>
              <th className="text-left w-1/3">支払日</th>
            </TableHeader>
            <TableBody>
              {invoiceList && invoiceList.length ? (
                invoiceList.map((invoice, index) => (
                  <tr key={index}>
                    <td className="text-left w-1/3 truncate">
                      {invoice.invoiceTarget
                        ? renderDate(
                            invoice.invoiceTarget,
                            JAPAN_YEAR_MONTH_FORMAT,
                          )
                        : ''}
                    </td>
                    <td className="text-left w-1/3 truncate">
                      {invoice.status}
                    </td>
                    <td className="text-left w-1/3 truncate">
                      {invoice.paidAt
                        ? renderDate(invoice.paidAt, JAPAN_DATE_FORMAT)
                        : ''}
                    </td>
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
          {invoiceList && invoiceList.length ? (
            <Pagination
              onChange={(pageNumber) => setCurrentPage(pageNumber)}
              currentPage={currentPage}
              totalPages={totalPages}
            />
          ) : null}
        </div>
      </section>
    </div>
  );
};
