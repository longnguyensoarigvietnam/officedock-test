'use client';
import TreeModel from 'tree-model';
import { useContext, useState } from 'react';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { useMutation } from 'react-query';
import '../../../../../components/TreeNode/styles/treeNode.css';

import { TeamItem } from '@components/TreeNode/TeamItem';
import Button from '@components/common/Button';
import ImageRound from '@components/common/ImageRound';
import Dropdown from '@components/common/Dropdown';
import TableDropdown from '@components/common/Dropdown/TableDropdown';

import {
  ERROR_UPDATE_MESSAGE,
  SUCCESS_UPDATE_MESSAGE,
} from '@constants/message';
import { apiRouters, pageRouters } from '@constants/routers';

import { ConfigNode, NodeDataRequest } from '@interfaces/organization';
import { OptionDropdownType } from '@interfaces/common';
import useDetailHierarchiesOrganization from '@hooks/useDetailHierarchiesOrganization';
import api from '@base/api';
import { LoadingContext } from '@providers/LoadingProvider';
import { useToast } from '@providers/ToastProvider';

export default function EditNode() {
  const router = useRouter();
  const { showToast } = useToast();

  const { setIsLoading } = useContext(LoadingContext);

  const [root, setRoot] = useState<any>(null);
  const [optionsTreeNode, setOptionsTreeNode] = useState<OptionDropdownType[]>(
    [],
  );
  const [listProject, setListProject] = useState<ConfigNode[]>([]);
  const [defaultRoot, setDefaultRoot] = useState<ConfigNode[]>([]);

  useDetailHierarchiesOrganization({
    onSuccess: (data) => {
      const dataTree = data.organizationHierarchies || [];

      setDefaultRoot(dataTree);
      const tree = new TreeModel();
      const clonedData = JSON.parse(JSON.stringify(dataTree));
      const rootConfig: ConfigNode = {
        uuid: 'root',
        name: 'root',
        children: clonedData,
      };

      const parsedTree = tree.parse(rootConfig);
      setRoot(parsedTree);
      const dataProject = data.projectOrganizations || [];
      setListProject(dataProject);
    },
  });

  const { detailHierarchiesOrganization: dataOptionDefault } =
    useDetailHierarchiesOrganization({
      has_children: false,
      onSuccess: (data) => {
        const list =
          data.organizationNotHierarchies?.map((item) => ({
            label: item.name || '',
            value: item.uuid,
          })) || [];
        setOptionsTreeNode(list);
      },
    });

  // Handle add default
  const handleAddNodeDefault = () => {
    const dataTree: ConfigNode[] = [
      {
        uuid: uuidv4(),
        value: 'treeNode',
        name: 'チーム',
        children: [],
      },
    ];
    const tree = new TreeModel();
    const clonedData = JSON.parse(JSON.stringify(dataTree));
    const rootConfig: ConfigNode = {
      uuid: 'root',
      name: 'root',
      children: clonedData,
    };

    const parsedTree = tree.parse(rootConfig);
    setRoot(parsedTree);
  };

  // Handle add child to node
  const addChildToNode = (targetUuId: string) => {
    if (!root) return;

    // Find the node with the matching id in the current tree
    const targetNode = root.first(
      (node: any) => node.model.uuid === targetUuId,
    );

    if (targetNode) {
      const newItem: ConfigNode = {
        uuid: uuidv4(),
        name: 'チーム',
        value: 'treeNode',
        parentUuid: targetUuId,
        children: [],
      };

      // Add newItem to the list of children of the found node
      targetNode.model.children.push(newItem);

      // Recreate new tree from root.model and save to state
      const tree = new TreeModel();
      const updatedTree = tree.parse({
        id: 'root',
        children: root.model.children,
      });
      // Update state with new tree

      setRoot(updatedTree);
    } else {
      return;
    }
  };

  // Handle add node sibling
  const addSiblingNode = (targetUuId: string) => {
    if (!root) return;
    // Find the node with id targetUuId
    const targetNode = root.first(
      (node: any) => node.model.uuid === targetUuId,
    );

    if (targetNode && targetNode.parent) {
      const parent = targetNode.parent;
      const siblings = parent.model.children;

      const newItem: ConfigNode = {
        uuid: uuidv4(),
        name: 'チーム',
        value: 'treeNode',
        parentUuid: parent.model.uuid === 'root' ? null : parent.model.uuid,
        children: [],
      };

      // Find the index of the current node in its parent's children list
      const targetIndex = siblings.findIndex(
        (child: ConfigNode) => child.uuid === targetUuId,
      );

      if (targetIndex !== -1) {
        // Add new node right after current node
        siblings.splice(targetIndex + 1, 0, newItem);

        // Parse the entire tree to keep the TreeModel structure intact
        const tree = new TreeModel();
        const updatedTree = tree.parse(root.model);
        setRoot(updatedTree);
      } else {
        return;
      }
    } else {
      return;
    }
  };
  // Update options
  const handleSelectChange = ({
    oldSelected,
    newSelected,
  }: {
    oldSelected: OptionDropdownType;
    newSelected: OptionDropdownType;
  }) => {
    setOptionsTreeNode((prev) => {
      const filtered = prev.filter((opt) => opt.value !== oldSelected.value);
      const alreadyExists = filtered.some(
        (opt) => opt.value === newSelected.value,
      );

      if (!alreadyExists && newSelected.value !== 'treeNode') {
        filtered.push(newSelected);
      }

      return filtered;
    });
  };

  // Update data node
  const updateNodeValue = ({
    targetUuid,
    name,
    value,
  }: {
    targetUuid: string;
    name: string;
    value: string;
  }) => {
    if (!root) return;

    const targetNode = root.first(
      (node: any) => node.model.uuid === targetUuid,
    );

    if (targetNode) {
      targetNode.model.name = name;
      targetNode.model.value = value;
      targetNode.model.uuid = value;

      if (targetNode.model.children && targetNode.model.children.length > 0) {
        targetNode.model.children = targetNode.model.children.map(
          (child: ConfigNode) => ({
            ...child,
            parentUuid: value,
          }),
        );
      }
      const tree = new TreeModel();
      const updatedTree = tree.parse({
        id: 'root',
        children: root.model.children,
      });

      setRoot(updatedTree);
    }
  };

  const flattenTreeFromParsedRoot = (
    root: TreeModel.Node<ConfigNode>,
  ): Omit<ConfigNode, 'children'>[] => {
    const result: Omit<ConfigNode, 'children'>[] = [];

    root.walk((node) => {
      const { uuid, name, value, parentUuid } = node.model;

      if (uuid !== 'root' && value !== 'treeNode') {
        result.push({ uuid, name, parentUuid });
      }
      return true;
    });

    return result;
  };

  //  Function call API edit skill
  const handleEditHierarchyOrganization = async (data: NodeDataRequest[]) => {
    setIsLoading(true);
    return await api.post(apiRouters.ORGANIZATION_HIERARCHY, {
      organizations: data,
    });
  };

  const { mutate: editHierarchyOrganization } = useMutation(
    'postEditHierarchyOrganization',
    handleEditHierarchyOrganization,
    {
      onSuccess: () => {
        showToast({
          description: SUCCESS_UPDATE_MESSAGE,
        });
        router.push(pageRouters.ORGANIZATION_HIERARCHY.href);
      },
      onError: () => {
        showToast({
          variant: 'error',
          description: ERROR_UPDATE_MESSAGE,
        });
      },
      onSettled: () => {
        setIsLoading(false);
      },
    },
  );

  const handleSaveChangeNode = () => {
    const dataOrganization = flattenTreeFromParsedRoot(root).filter(
      (item) => item.uuid,
    );
    const dataProject = listProject
      .map((pro) => ({ ...pro, type: 'PROJECT' }))
      .filter((item) => item.value !== 'treeNode');
    const dataOption = optionsTreeNode.map((item) => ({
      name: item.label,
      uuid: item.value as string,
      type: 'NORMAL',
    }));

    editHierarchyOrganization([
      ...dataProject,
      ...dataOption,
      ...dataOrganization,
    ]);
  };

  const handleResetNode = () => {
    router.push(pageRouters.ORGANIZATION_HIERARCHY.href);
    const tree = new TreeModel();
    const clonedData = JSON.parse(JSON.stringify(defaultRoot));

    const rootConfig: ConfigNode = {
      uuid: 'root',
      name: 'root',
      children: clonedData,
    };

    const parsedTree = tree.parse(rootConfig);
    setRoot(parsedTree);
    if (dataOptionDefault) {
      const list =
        dataOptionDefault.organizationHierarchies?.map((item) => ({
          label: item.name || '',
          value: item.uuid,
        })) || [];
      setOptionsTreeNode(list);
    }
  };

  // Project hierarchy add team
  const handleAddProjectTeam = () => {
    const newItem: ConfigNode = {
      uuid: uuidv4(),
      name: 'チーム',
      value: 'treeNode',
      children: [],
    };
    setListProject([...listProject, newItem]);
  };
  // Project hierarchy update item
  const updateItemProject = ({
    uuid,
    name,
    value,
  }: {
    uuid: string;
    name: string | null;
    value: string;
  }) => {
    const newList = listProject.map((item) =>
      item.uuid === uuid ? { ...item, name, value, uuid: value } : item,
    );
    setListProject(newList);
  };

  const isLastChild = (targetUuid: string): boolean => {
    if (!root) return false;

    // Find the node with id targetUuid
    const targetNode = root.first(
      (node: any) => node.model.uuid === targetUuid,
    );

    if (!targetNode) {
      return false;
    }

    // If the node is root (has no parent) then it is considered YES
    if (!targetNode.parent) {
      return true;
    }

    const parent = targetNode.parent;
    const siblings = parent.model.children;

    // Kiểm tra xem nó có phải là phần tử cuối cùng trong danh sách con của cha không
    const lastChild = siblings[siblings.length - 1];

    return lastChild.uuid === targetUuid;
  };

  const Parent = ({ item }: { item: ConfigNode }) => {
    const isAddSiblingToNode = isLastChild(item.uuid);
    const isAddChildToNode = item.children && item.children.length === 0;
    return (
      <div className={`tree-custom-item relative `}>
        <div className="w-[220px]">
          <TableDropdown
            options={optionsTreeNode}
            selectedOption={{
              label: item.name || '',
              value: item.uuid,
            }}
            className="!h-[34px] !py-0 !pr-0"
            valueClassName="!pr-4 !py-0 !text-sm !font-normal  !rounded-md !min-h-0 border border-[#77858F]"
            labelClass="!min-h-0 !font-normal !text-sm"
            onChange={(e) => {
              handleSelectChange({
                newSelected: {
                  label: item.name || '',
                  value:
                    item.value && item.value === 'treeNode'
                      ? item.value
                      : item.uuid,
                },
                oldSelected: e,
              });

              updateNodeValue({
                targetUuid: item.uuid,
                name: e.label,
                value: e.value as string,
              });
            }}
          />
        </div>
        {isAddChildToNode && (
          <div
            onClick={() => {
              if (item.value === 'treeNode') return;
              addChildToNode(item.uuid);
            }}
            className="absolute  z-[999] right-[-40px] top-[5px]  w-6 h-6 rounded-full ">
            <Button
              sz="sm"
              disabled={item.value === 'treeNode'}
              variant="outline"
              className="w-6 h-6  text-xs !py-0 !px-0 border-none !rounded-full !bg-[#ECF0F2] hover:opacity-70"
              type="button">
              <ImageRound
                src="/icons/plus.svg"
                name="Add organization"
                className="h-3 w-3"
              />
            </Button>
          </div>
        )}
        {isAddSiblingToNode && (
          <div
            onClick={() => addSiblingNode(item.uuid)}
            className="absolute bottom-[-30px] left-1/2 transform z-[20] -translate-x-1/2 w-6 h-6 rounded-full ">
            <Button
              sz="sm"
              variant="outline"
              className="w-6 h-6  text-xs !py-0 !px-0 border-none !rounded-full !bg-[#ECF0F2] hover:opacity-70"
              type="button">
              <ImageRound
                src="/icons/plus.svg"
                name="Add organization"
                className="h-3 w-3"
              />
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <div className="flex justify-between items-start">
        <div className="flex gap-5 items-center mb-5 w-fit">
          <p className="text-black font-medium text-[26px]">チーム管理</p>
          <div className="flex justify-center items-center gap-2 ">
            <Button
              onClick={() => {
                router.push(pageRouters.ORGANIZATION_MANAGEMENT.href);
              }}
              variant={'outline'}
              className={`!text-[#77858F] !bg-transparent !border-[#77858F] !py-0 !px-0 font-bold w-[80px] h-7 !rounded-[20px] text-xs`}>
              チーム作成
            </Button>
            <Button
              variant={'primary'}
              className={`!py-0 !px-0 font-bold w-[80px] h-7 
              !rounded-[20px] text-xs`}>
              チーム階層
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-[10px]">
          <Button
            variant="outline"
            type="button"
            onClick={handleResetNode}
            className="w-[100px] !rounded-md  h-[34px] !text-[14px] !px-2">
            キャンセル
          </Button>
          <Button
            type="button"
            onClick={handleSaveChangeNode}
            className="w-[100px] h-[34px] !text-[14px] !px-2 ">
            保存
          </Button>
        </div>
      </div>
      <div className="bg-white p-[30px] overflow-auto max-w-[calc(100vw_-_288px)] min-h-[538px] min-w-[1152px]  rounded-[14px]">
        <p className="text-base font-medium text-[#77858F] mb-[30px]">
          チーム階層
        </p>
        <div className="hr-teams pb-5 w-fit ">
          {root && root.model.children.length === 0 ? (
            <div
              onClick={handleAddNodeDefault}
              className="w-6 h-6 rounded-full ">
              <Button
                sz="sm"
                variant="outline"
                className="w-6 h-6  text-xs !py-0 !px-0 border-none !rounded-full !bg-[#ECF0F2] hover:opacity-70"
                type="button">
                <ImageRound
                  src="/icons/plus.svg"
                  name="Add organization"
                  className="h-3 w-3"
                />
              </Button>
            </div>
          ) : (
            root && <TeamItem items={root.model.children} itemNode={Parent} />
          )}
        </div>
      </div>
      <div className="bg-white p-[30px] w-full min-h-[190px] rounded-[14px] mb-10">
        <p className="text-base font-medium text-[#77858F] mb-[30px] ">
          プロジェクトチーム
        </p>
        <div className="flex flex-wrap gap-4 w-full">
          {listProject.length > 0 ? (
            listProject.map((item, index) => (
              <div key={index} className="w-[204px] relative">
                <Dropdown
                  options={optionsTreeNode}
                  className="h-[34px] !py-0  !rounded-md border !border-[#77858F]"
                  classNameOption="!z-[30] top-[-228px]"
                  placeholder="チーム"
                  selectedOption={{
                    label: item.name || '',
                    value: item.uuid,
                  }}
                  placeholderClass="!text-black text-sm font-normal"
                  onChange={(e) => {
                    handleSelectChange({
                      newSelected: {
                        label: item.name || '',
                        value:
                          item.value && item.value === 'treeNode'
                            ? item.value
                            : item.uuid,
                      },
                      oldSelected: e,
                    });
                    updateItemProject({
                      uuid: item.uuid,
                      name: e.label,
                      value: e.value as string,
                    });
                  }}
                />
                {index === listProject.length - 1 && (
                  <div
                    onClick={() => {
                      if (item.value === 'treeNode') return;
                      handleAddProjectTeam();
                    }}
                    className="absolute  z-[30] right-[-40px] top-[5px]  w-6 h-6 rounded-full ">
                    <Button
                      sz="sm"
                      disabled={item.value === 'treeNode'}
                      variant="outline"
                      className="w-6 h-6  text-xs !py-0 !px-0 border-none !rounded-full !bg-[#ECF0F2] hover:opacity-70"
                      type="button">
                      <ImageRound
                        src="/icons/plus.svg"
                        name="Add organization"
                        className="h-3 w-3"
                      />
                    </Button>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="w-6 h-6 rounded-full ">
              <Button
                sz="sm"
                onClick={handleAddProjectTeam}
                variant="outline"
                className="w-6 h-6  text-xs !py-0 !px-0 border-none !rounded-full !bg-[#ECF0F2] hover:opacity-70"
                type="button">
                <ImageRound
                  src="/icons/plus.svg"
                  name="Add organization"
                  className="h-3 w-3"
                />
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
