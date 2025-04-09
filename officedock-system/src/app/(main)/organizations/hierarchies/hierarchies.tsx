'use client';
import TreeModel from 'tree-model';
import { useState } from 'react';
import '../../../../components/TreeNode/styles/treeNode.css';

import { TeamItem } from '@components/TreeNode/TeamItem';

import { ConfigNode } from '@interfaces/organization';
import useDetailHierarchiesOrganization from '@hooks/useDetailHierarchiesOrganization';

export default function HierarchyOrganization() {
  const [root, setRoot] = useState<any>(null);
  const [listItemRoot, setListItemRoot] = useState<ConfigNode[]>([]);

  useDetailHierarchiesOrganization({
    onSuccess: (data) => {
      const tree = new TreeModel();
      const rootConfig: ConfigNode = {
        uuid: 'root',
        name: 'root',
        children: data,
      };

      const parsedTree = tree.parse(rootConfig);
      setRoot(parsedTree);
    },
  });
  useDetailHierarchiesOrganization({
    has_children: false,
    onSuccess: (data) => {
      setListItemRoot(data);
    },
  });

  const Parent = ({ item }: { item: ConfigNode }) => {
    return (
      <div
        className={`tree-custom-item relative bg-[#0068B6] rounded-md text-white text-base font-medium flex items-center px-[10px] break-all`}>
        <p className="w-full break-all truncate">{item.name}</p>
      </div>
    );
  };

  return (
    <>
      <div className="bg-white p-[30px] overflow-auto max-w-[calc(100vw_-_288px)] min-h-[538px] min-w-[1152px]  rounded-[14px]">
        <p className="text-base font-medium text-[#77858F] mb-[30px]">
          チーム階層
        </p>
        <div className="hr-teams pb-5 w-fit ">
          {root && (
            <TeamItem
              marginBottomDefault={10}
              items={root.model.children}
              itemNode={Parent}
            />
          )}
        </div>
      </div>
      <div className="bg-white p-[30px] w-full min-h-[190px] rounded-[14px]">
        <p className="text-base font-medium text-[#77858F] mb-[30px]">
          プロジェクトチーム
        </p>
        <div className="flex flex-wrap gap-4 w-full">
          {listItemRoot.map((item, index) => (
            <div
              key={index}
              className="w-[204px] bg-[#0068B6] h-[34px] rounded-md text-white text-base font-medium flex items-center px-[10px] break-all">
              {item.name}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
