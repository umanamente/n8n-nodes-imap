import { allResourceDefinitions } from "../operations/ResourcesList";
import { IResourceOperationDef } from "./CommonDefinitions";

export function  getResourceOperationDef(resource: string, operation: string) : IResourceOperationDef | null {
  var foundOperationDef = null;
  for (const resourceDef of allResourceDefinitions) {
    if (resourceDef.resource.value == resource) {
      for (const operationDef of resourceDef.operationDefs) {
        if (operationDef.operation.value == operation) {
          foundOperationDef = operationDef;
          break;
        }
      }
      break;
    }
  }
  return foundOperationDef;
}
