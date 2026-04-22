import { SkeletonElement } from "."

export const AllocationSkeleton = () => {
    return <div className="flex flex-col mt-[50px]">
        <SkeletonElement className="!w-full !h-[20px] !rounded-[4px] mb-[6px]" />
        <SkeletonElement className="!w-full !h-[20px] !rounded-[4px] mb-8" />
        <SkeletonElement className="!w-full !h-[20px] !rounded-[4px] mb-[6px]" />
        <SkeletonElement className="!w-full !h-[20px] !rounded-[4px]" />
    </div>
}