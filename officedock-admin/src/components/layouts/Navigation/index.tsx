'use client';
import { useEffect, useState } from 'react';
import { useParams, usePathname } from 'next/navigation';

import Breadcrumbs, { BreadcrumbsItem } from '@components/common/Breadcrumbs';
import { breadcrumbsData } from '@constants/breadcrumbs';

type Props = {
  className?: string;
};

const Navigation = ({ className }: Props) => {
  const params = useParams();
  const pathname = usePathname();
  const [breadcrumbs, setBreadCrumbs] = useState<BreadcrumbsItem[]>();

  useEffect(() => {
    const getBreadcrumbs = () => {
      const pathSegments = pathname
        .split('/')
        .filter((segment) => segment !== '')
        .map((segment) => {
          if (segment === params.id) {
            return 'id';
          }
          return segment;
        });
      const breadcrumbs: BreadcrumbsItem[] = [];
      let accumulatedPath = '';

      pathSegments.forEach((segment: any) => {
        accumulatedPath += `/${segment}`;

        if (breadcrumbsData[accumulatedPath]) {
          const breadcrumb = {
            ...breadcrumbsData[accumulatedPath],
            current: false,
          };
          let updatedHref = breadcrumb.href;
          Object.keys(params).forEach((element) => {
            updatedHref = updatedHref.replace(
              `${element}`,
              String(params[element]),
            );
          });
          breadcrumb.href = updatedHref;
          if ('removeBefore' in breadcrumb && breadcrumb.removeBefore) {
            breadcrumbs.pop();
          }
          breadcrumbs.push(breadcrumb);
        }
      });

      if (breadcrumbs.length > 0) {
        breadcrumbs[breadcrumbs.length - 1].current = true;
      }
      return breadcrumbs;
    };

    setBreadCrumbs(getBreadcrumbs());
  }, [pathname, params]);
  return (
    <nav className={`flex h-6`} aria-label="Breadcrumb">
      {breadcrumbs && (
        <Breadcrumbs pages={breadcrumbs} className={`${className}`} />
      )}
    </nav>
  );
};

export default Navigation;
