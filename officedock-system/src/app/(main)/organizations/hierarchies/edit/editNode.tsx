'use client';
import TreeModel from 'tree-model';
import { useContext, useState } from 'react';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { AxiosError } from 'axios';
import { useMutation } from 'react-query';
import '../../../../../components/TreeNode/styles/treeNode.css';

import { TeamItem } from '@components/TreeNode/TeamItem';
import Button from '@components/common/Button';
import ImageRound from '@components/common/ImageRound';
import Dropdown from '@components/common/Dropdown';
import TableDropdown from '@components/common/Dropdown/TableDropdown';
import ConfirmHiddenModal from '@components/modals/ConfirmHiddenModal';

import {
  ERROR_UPDATE_MESSAGE,
  SUCCESS_UPDATE_MESSAGE,
} from '@constants/message';
import { apiRouters, pageRouters } from '@constants/routers';

import { ConfigNode, NodeDataRequest } from '@interfaces/organization';
import { OptionDropdownType } from '@interfaces/common';

import useDetailHierarchiesOrganization from '@hooks/useDetailHierarchiesOrganization';
import { useErrorToast } from '@hooks/useErrorToast';

import api from '@base/api';
import { LoadingContext } from '@providers/LoadingProvider';
import { useToast } from '@providers/ToastProvider';
import { GlobalStateContext } from '@providers/GlobalStateProvider';

export default function EditNode() {
  const router = useRouter();
  const { showToast } = useToast();
  const showErrorToast = useErrorToast();

  const { setIsLoading } = useContext(LoadingContext);
  const { expanded } = useContext(GlobalStateContext);

  const [root, setRoot] = useState<any>(null);
  const [optionsTreeNode, setOptionsTreeNode] = useState<OptionDropdownType[]>(
    [],
  );
  const [listProject, setListProject] = useState<ConfigNode[]>([]);
  const [defaultRoot, setDefaultRoot] = useState<ConfigNode[]>([]);

  // Delete
  const [openConfirmDeleteModal, setOpenConfirmDeleteModal] = useState(false);
  const [orgUuidDelete, setOrgUuidDelete] = useState<{
    uuid: string;
    name: string;
  } | null>(null);

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
          data.organizationNotHierarchies
            ?.filter((org) => !org.deletedAt)
            .map((item) => ({
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
        name: '選択してください',
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
        name: '選択してください',
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
  // Handle delete sibling node
  const deleteSiblingNode = (targetUuId: string) => {
    if (!root) return;

    // find the node to delete
    const targetNode = root.first(
      (node: any) => node.model.uuid === targetUuId,
    );
    if (!targetNode || !targetNode.parent) return;

    // 1) Collect all deleted nodes (including the root node and all descendants)
    const nodesToRestore: OptionDropdownType[] = [];
    targetNode.walk((n: any) => {
      const m = n.model;
      // Only take nodes with valid values (not the placeholder 'treeNode') and not the root
      if (m && m.uuid !== 'root' && m.value !== 'treeNode') {
        const already = nodesToRestore.some((it) => it.value === m.uuid);
        if (!already) {
          nodesToRestore.push({
            label: m.name || '',
            value: m.uuid,
            isHidden: m.deletedAt,
          });
        }
      }
      return true;
    });

    // 2) Remove the node from the parent's children list
    const parent = targetNode.parent;
    parent.model.children = parent.model.children.filter(
      (child: ConfigNode) => child.uuid !== targetUuId,
    );

    // 3) Rebuild the tree and update the state
    const tree = new TreeModel();
    const updatedTree = tree.parse(root.model);
    setRoot(updatedTree);
    // 4) Restore the collected options back to optionsTreeNode (avoid duplicates)
    if (nodesToRestore.length > 0) {
      setOptionsTreeNode((prev) => {
        const next = [...prev];
        nodesToRestore.forEach((item) => {
          if (item.isHidden) return;
          const exists = next.some((opt) => opt.value === item.value);
          if (!exists) next.push(item);
        });
        return next;
      });
    }
  };

  const handleConfirmDelete = () => {
    if (orgUuidDelete) deleteSiblingNode(orgUuidDelete?.uuid);
    setOpenConfirmDeleteModal(false);
    setOrgUuidDelete(null);
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
        name: '選択してください',
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

      if (
        !alreadyExists &&
        newSelected.value !== 'treeNode' &&
        !newSelected.isHidden
      ) {
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
        result.push({
          uuid,
          name,
          parentUuid,
          type: 'NORMAL',
          is_hierarchy: true,
        });
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

      onError: (error: AxiosError<any>) => {
        showErrorToast(error, ERROR_UPDATE_MESSAGE);
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
      .map((pro) => ({
        ...pro,
        type: 'PROJECT',
        parentUuid: null,
        is_hierarchy: true,
      }))
      .filter((item) => item.value !== 'treeNode');

    editHierarchyOrganization([...dataOrganization, ...dataProject]);
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
      name: '選択してください',
      value: 'treeNode',
      children: [],
    };
    setListProject([...listProject, newItem]);
  };
  const handleDeleteProject = (uuid: string) => {
    setListProject((prev) => {
      const deletedProject = prev.find((item) => item.uuid === uuid);
      if (
        deletedProject &&
        deletedProject.uuid &&
        deletedProject.uuid !== 'treeNode'
      ) {
        setOptionsTreeNode((prevOptions) => {
          if (deletedProject.deletedAt) return prevOptions;
          const exists = prevOptions.some(
            (opt) => opt.value === deletedProject.uuid,
          );
          if (exists) return prevOptions;
          return [
            ...prevOptions,
            {
              label: deletedProject.name || '',
              value: deletedProject.uuid,
            },
          ];
        });
      }
      return prev.filter((item) => item.uuid !== uuid);
    });
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
    const newList = listProject.map((item) => {
      return item.uuid === uuid ? { ...item, name, value, uuid: value } : item;
    });
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
              isHidden: item.deletedAt,
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
                  isHidden: item.deletedAt,
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
            className="absolute  z-[10] right-[-70px] top-[5px]  w-6 h-6 rounded-full ">
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
        {/* Delete sibling   */}
        <div
          onClick={() => {
            setOrgUuidDelete({
              uuid: item.uuid,
              name: item.name || '',
            });
            setOpenConfirmDeleteModal(true);
          }}
          className="absolute bottom-[4px] right-[-32px] transform z-[30]  w-6 h-6 rounded-full ">
          <Button
            sz="sm"
            variant="outline"
            className="w-6 h-6  text-xs !py-0 !px-0 border-none !rounded-full !bg-[#ECF0F2] hover:opacity-70"
            type="button">
            <ImageRound
              src="/icons/delete-org.svg"
              name="Delete organization"
              className="!h-fit !w-fit"
            />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="flex px-10 justify-between items-start">
        <div className="flex gap-5 items-center w-fit">
          <p className="text-black font-medium text-[26px]">チーム管理</p>
          <div className="flex justify-center items-center gap-2 bg-white w-fit p-[6px] rounded-[20px] ">
            <Button
              onClick={() => {
                router.push(pageRouters.ORGANIZATION_MANAGEMENT.href);
              }}
              variant={'outline'}
              className={`w-[80px] !p-0 text-xs h-[28px] !font-bold !text-[#77858F] !bg-[#EBF1F7] border-none !rounded-[20px]`}>
              チーム作成
            </Button>
            <Button
              variant={'primary'}
              className={`w-[80px] !p-0 text-xs h-[28px] !font-bold text-white border-none !rounded-[20px]`}>
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
            className="w-[100px] h-[34px] !text-[14px] !px-2 border-none"
            style={{ boxShadow: '0px 1px 5px 0px #00000033' }}>
            保存
          </Button>
        </div>
      </div>
      <div className=" flex flex-col gap-5 h-[calc(100vh_-_215px)] overflow-y-auto">
        <div className="px-10">
          <div
            className={`bg-[#F8FAFC] p-[30px] overflow-auto ${expanded ? 'max-w-[calc(100vw_-_288px)]' : 'max-w-[calc(100vw_-_172px)]'}  min-h-[538px] min-w-[1152px]  rounded-[30px]`}>
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
                root && (
                  <TeamItem items={root.model.children} itemNode={Parent} />
                )
              )}
            </div>
          </div>
          <div className="bg-[#F8FAFC] p-[30px] mt-5 w-full min-h-[190px] rounded-[30px] mb-10">
            <p className="text-base font-medium text-[#77858F] mb-[30px] ">
              プロジェクトチーム
            </p>
            <div className="flex flex-wrap gap-4 w-full">
              {listProject.length > 0 ? (
                listProject.map((item, index) => (
                  <div
                    key={index}
                    className={`${index === listProject.length - 1 ? 'w-[248px] ' : 'w-[204px] '} relative flex items-center gap-[10px] `}>
                    <div className="w-[170px]">
                      <Dropdown
                        options={optionsTreeNode}
                        className="h-[34px] !py-0  !rounded-md border !border-[#77858F]"
                        classNameOption={`!z-[30]  bottom-[40px]`}
                        placeholder="選択してください"
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
                              isHidden: item.deletedAt,
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
                    </div>
                    <div
                      onClick={() => handleDeleteProject(item.uuid)}
                      className=" transform z-[30]  w-6 h-6 rounded-full ">
                      <Button
                        sz="sm"
                        variant="outline"
                        className="w-6 h-6  text-xs !py-0 !px-0 border-none !rounded-full !bg-[#ECF0F2] hover:opacity-70"
                        type="button">
                        <ImageRound
                          src="/icons/delete-org.svg"
                          name="Delete organization"
                          className="!h-fit !w-fit"
                        />
                      </Button>
                    </div>
                    {index === listProject.length - 1 && (
                      <div
                        onClick={() => {
                          if (item.value === 'treeNode') return;
                          handleAddProjectTeam();
                        }}
                        className=" w-6 h-6 rounded-full ">
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
        </div>
      </div>
      {openConfirmDeleteModal && (
        <ConfirmHiddenModal
          open={openConfirmDeleteModal}
          name={orgUuidDelete?.name}
          type="チーム"
          msgMain="このチームを階層から解除しますか？"
          message="このチームに紐づくチームも階層から解除されます。"
          classNameMsg="mt-[2px] text-sm !text-[#000000]"
          classNameMain="!mb-5"
          onConfirm={handleConfirmDelete}
          onClose={() => {
            setOpenConfirmDeleteModal(false);
          }}
        />
      )}
    </>
  );
}
