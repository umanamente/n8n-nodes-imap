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

// get the parts info from the body structure
export function getEmailPartsInfoRecursive(context: IExecuteFunctions, bodyStructure: any): EmailPartInfo[] {
  var partsInfo: EmailPartInfo[] = [];

  if (bodyStructure.childNodes) {
    for (const childNode of bodyStructure.childNodes) {
      // process only if "size" is present
      if ("size" in childNode) {
        var partInfo: EmailPartInfo = {
          partId: childNode.part,
          type: childNode.type,
          encoding: childNode.encoding,
          size: childNode.size,
        };
        if ("disposition" in childNode) {
          partInfo.disposition = childNode.disposition;
          if (childNode.disposition === 'attachment') {
            partInfo.filename = childNode.dispositionParameters?.filename;
          }
        }
        partsInfo.push(partInfo);
      }

      // check if there are child nodes
      if (childNode.childNodes) {
        // recurse
        partsInfo = partsInfo.concat(getEmailPartsInfoRecursive(context, childNode));
      }
    }
  }
  return partsInfo;
}
