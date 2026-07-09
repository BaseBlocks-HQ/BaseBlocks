import { type FunctionReference, makeFunctionReference } from "convex/server";

type DeleteObjectArgs = {
  objectKey: string;
};

type DeleteObjectResult = {
  deleted: boolean;
};

export const deleteObjectAction = makeFunctionReference<
  "action",
  DeleteObjectArgs,
  DeleteObjectResult
>("objectStorage/deleteObject:deleteObject") as unknown as FunctionReference<
  "action",
  "internal",
  DeleteObjectArgs,
  DeleteObjectResult
>;
