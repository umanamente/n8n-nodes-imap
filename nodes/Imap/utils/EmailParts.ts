import { MessageStructureObject } from "imapflow";
import { IExecuteFunctions } from "n8n-workflow";

export interface EmailPartInfo {
  partId: string;
  filename?: string;
  type: string;
  encoding: string;
  size: number;
  disposition?: string;
  parameters?: [string, string];
}


// get the part info from a body structure object (don't recurse)
function getEmailPartInfoFromBodystructureNode(context: IExecuteFunctions, bodyStructure: MessageStructureObject): EmailPartInfo {
  let partInfo: EmailPartInfo = {
    partId: bodyStructure.part || '',
    type: bodyStructure.type,
    encoding: bodyStructure.encoding || '7bit',
    size: bodyStructure.size || 0,
    disposition: bodyStructure.disposition,
    filename: bodyStructure.dispositionParameters?.filename,
  };

  return partInfo;
}

// get the parts info from the body structure
export function getEmailPartsInfoRecursive(context: IExecuteFunctions, bodyStructure: MessageStructureObject): EmailPartInfo[] {
  var partsInfo: EmailPartInfo[] = [];

  // process the current node
  partsInfo.push(getEmailPartInfoFromBodystructureNode(context, bodyStructure));

  // check for child nodes
  if (bodyStructure.childNodes) {
    for (const childNode of bodyStructure.childNodes) {
      // recurse into child nodes
      partsInfo = partsInfo.concat(getEmailPartsInfoRecursive(context, childNode));
    }
  }
  return partsInfo;
}
