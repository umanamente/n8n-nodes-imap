import { ImapFlow } from "imapflow";
import { IExecuteFunctions, INodeExecutionData, INodeProperties, INodePropertyOptions, NodeExecutionWithMetadata, Logger as N8nLogger } from 'n8n-workflow';

export interface IResourceOperationDef {
  operation: INodePropertyOptions;
  parameters: INodeProperties[];
  executeImapAction: (context: IExecuteFunctions, logger:N8nLogger, itemIndex: number, client: ImapFlow) => Promise<INodeExecutionData[] | NodeExecutionWithMetadata[] | null>;
};

export interface IResourceDef {
  resource: INodePropertyOptions;
  operationDefs: IResourceOperationDef[];
};

/**
 *
 * @param resourceDef resource definition
 * @returns all parameters from all operations related to the resource
 */
export function getAllResourceNodeParameters(resourceDef: IResourceDef) : INodeProperties[] {

  // eslint-disable-next-line n8n-nodes-base/node-param-default-missing
  const operationNodeProperties  : INodeProperties = {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    default: resourceDef.operationDefs[0].operation.value,
    noDataExpression: true,
    displayOptions: {
      show: {
        resource: [
          resourceDef.resource.value,
        ],
      },
    },
    options: resourceDef.operationDefs.map((operationDef) => operationDef.operation),
  };

  // extend each operation parameters to filter by resource and operation
  var filteredOperationParameters = resourceDef.operationDefs.map((operationDef) => {
    return operationDef.parameters.map((parameter) => {
      // if displayOptions exist, extend them
      if (parameter.displayOptions) {
        parameter.displayOptions.show = {
          ...parameter.displayOptions.show,
          resource: [
            resourceDef.resource.value,
          ],
          operation: [
            operationDef.operation.value,
          ],
        };
      } else {
        parameter.displayOptions = {
          show: {
            resource: [
              resourceDef.resource.value,
            ],
            operation: [
              operationDef.operation.value,
            ],
          },
        };
      }
      return parameter;
    });
  });

  // combine all parameters
  var allParameters: INodeProperties[] = [
    // operation
    operationNodeProperties,

    // related parameters
    ...filteredOperationParameters.flat(),
  ];

  return allParameters;
};
