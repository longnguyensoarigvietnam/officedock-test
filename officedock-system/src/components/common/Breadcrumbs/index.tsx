import Link from 'next/link';
import ImageRound from '../ImageRound';

export type BreadcrumbsItem = {
  name: string;
  href: string;
  current: boolean;
  removeBefore?: boolean;
};

export type BreadcrumbsProps = {
  pages: BreadcrumbsItem[];
  className?: string;
};

const Breadcrumbs = ({ pages, className }: BreadcrumbsProps) => {
  return (
    <ol role="list" className={`flex items-center gap-2 ${className}`}>
      {pages.map((page, index) => (
        <li key={page.name}>
          <div className="flex items-center gap-2">
            {index !== 0 && (
              <ImageRound
                className="w-auto h-auto"
                name="Slash breadcrumbs icon"
                src={`/icons/slash.svg`}
              />
            )}

            <Link
              href={page.current ? '#' : page.href}
              className={`text-sm ${page.current ? 'text-primary' : 'text-gray-500 hover:text-primary'}`}
              aria-current={page.current ? 'page' : undefined}>
              {page.name}
            </Link>
          </div>
        </li>
      ))}
    </ol>
  );
};

export default Breadcrumbs;
