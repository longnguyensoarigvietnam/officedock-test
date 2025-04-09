import React from 'react';
import './styles/treeNode.css';
import { ConfigNode } from '@interfaces/organization';

interface TeamItemProps {
  items: ConfigNode[];
  hasParent?: boolean;
  level?: number;
  itemNode: React.ComponentType<{ item: ConfigNode }>;
  marginBottomDefault?: number;
  itemHeightDefault?: number;
}

const countItemsWithoutChildren = (
  item: ConfigNode,
  count: number = 0,
): number => {
  if (item.children && item.children.length) {
    return item.children.reduce((acc, child) => {
      if (child.children && child.children.length) {
        return countItemsWithoutChildren(child, acc);
      } else {
        return acc + 1;
      }
    }, count);
  }
  return count;
};

export const countLineParams = (
  item: ConfigNode,
  hasItemBelow: boolean,
  marginBottom: number,
  itemHeight: number,
): { top: number; height: number } => {
  const baseHeight = itemHeight + marginBottom;
  const nestedChildrenCount = countItemsWithoutChildren(item);
  const top = itemHeight / 2;
  let height;
  if (hasItemBelow && !nestedChildrenCount) {
    height = baseHeight + 1;
  } else {
    height = baseHeight * nestedChildrenCount + 1;
  }
  return { top, height };
};

export const TeamItem: React.FC<TeamItemProps> = ({
  items,
  hasParent = false,
  level = 0,
  itemNode: Component,
  marginBottomDefault = 40,
  itemHeightDefault = 34,
}) => {
  const { length } = items;
  const isRoot = level === 0;

  return (
    <>
      {items.map((item, index) => {
        const { uuid } = item;
        const hasItemBelow = index < length - 1;
        const childrenCount = item.children && item.children.length;

        const { top, height } = countLineParams(
          item,
          hasItemBelow,
          marginBottomDefault,
          itemHeightDefault,
        );
        let marginBottom = marginBottomDefault;
        if (index === items.length - 1) {
          marginBottom = 0;
        }
        if (!level) {
          marginBottom = marginBottomDefault * 2;
        }

        return (
          <div className="item" key={uuid} style={{ marginBottom }}>
            <div className="item__parent">
              {!isRoot && hasItemBelow && (
                <div className="item__parent__line" style={{ top, height }} />
              )}
              <div
                className={
                  'item__parent__element' +
                  (childrenCount ? ' has-children' : '') +
                  (hasParent ? ' has-parent' : '')
                }
                style={{ height: itemHeightDefault }}>
                <Component item={item} />
              </div>
            </div>
            <div className="item__children">
              {childrenCount > 0 && (
                <TeamItem
                  items={item.children}
                  hasParent
                  level={level + 1}
                  itemNode={Component}
                  marginBottomDefault={marginBottomDefault}
                  itemHeightDefault={itemHeightDefault}
                />
              )}
            </div>
          </div>
        );
      })}
    </>
  );
};
