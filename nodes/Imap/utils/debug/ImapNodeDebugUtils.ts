import { IExecuteFunctions, INodeExecutionData, INodeOutputConfiguration, INodeProperties, NodeConnectionTypes } from "n8n-workflow";
import { DebugLoggerWatcher } from "./DebugLoggerWatcher";

export interface ImapNodeDebugParameters {
  debugOutputFormats: string[];
  debugEnableDebugImapLogs: boolean;
}

export class ImapNodeDebugUtils {


  static ImapNodeDebugUtilsEnabled(): boolean {
    return process.env.N8N_NODES_DEBUG_ENABLED === 'true';
  }

  static GetDebugNodeProperties(): INodeProperties[] {
    if (!ImapNodeDebugUtils.ImapNodeDebugUtilsEnabled()) {
      return [];
    }

    return [
      // notice: debug options start
      {
        displayName: 'Following debug options are for development purposes only. You see them because N8N_NODES_DEBUG_ENABLED environment variable is set to true.',
        name: 'noticeDebugOptionsStart',
        type: 'notice',
        default: '',
      },

      // output formats
      {
        displayName: 'Output Formats',
        name: "debugOutputFormats",
        type: "multiOptions",
        placeholder: "Add Debug Output",
        hint: "Select what debug information to output",
        default: ["logAsText", "logAsJson"],
        options: [
          {
            name: 'Log as Text',
            value: "logAsText",
          },
          {
            name: "Log as JSON",
            value: "logAsJson",
          },
        ],
      },
      // IMAP debug logs
      {
        displayName: 'Enable Debug IMAP Logs',
        name: 'debugEnableDebugImapLogs',
        type: 'boolean',
        default: true,
        description: 'Whether to enable debug logging for IMAP library (imapflow)',
      },
      // notice: debug options end
      {
        displayName: 'End of debug options',
        name: 'noticeDebugOptionsEnd',
        type: 'notice',
        default: '',
      },
    ];
  }

  static GetDebugNodeOutputProperties(): INodeOutputConfiguration[] {
    if (!ImapNodeDebugUtils.ImapNodeDebugUtilsEnabled()) {
      return [];
    }

    return [
      {        
        displayName: 'Debug Output',
        type: NodeConnectionTypes.Main,        
      },
    ];
  }

  static GetDebugSettingsFromNode(node: IExecuteFunctions): ImapNodeDebugParameters {
    if (!ImapNodeDebugUtils.ImapNodeDebugUtilsEnabled()) {
      return {
        debugOutputFormats: [],
        debugEnableDebugImapLogs: false,
      };
    }

    const FIRST_ITEM_INDEX = 0;
    const debugOutputFormats = node.getNodeParameter('debugOutputFormats', FIRST_ITEM_INDEX, []) as string[];
    const debugEnableDebugImapLogs = node.getNodeParameter('debugEnableDebugImapLogs', FIRST_ITEM_INDEX, false) as boolean;
    return {
      debugOutputFormats,
      debugEnableDebugImapLogs,
    };
  }

  static AddNodeDebugOutputData(
    parameters: ImapNodeDebugParameters, 
    outputBranches: INodeExecutionData[][], 
    loggerWatcher: DebugLoggerWatcher,
    caughtError: Error | null,
  ): void {
    if (!ImapNodeDebugUtils.ImapNodeDebugUtilsEnabled()) {
      return;
    }

    let debugBranchData: INodeExecutionData[] = [];
    let debugJson: any = {};
    let debugInfo: INodeExecutionData = {
      json: debugJson,
    };

    debugBranchData.push(debugInfo);
    outputBranches.push(debugBranchData);

    if (parameters.debugOutputFormats.includes('logAsText')) {
      debugJson['logAsText'] = loggerWatcher.getLogEntriesAsText();
    }
    if (parameters.debugOutputFormats.includes('logAsJson')) {
      debugJson['logAsJson'] = loggerWatcher.getLogEntriesAsArray();
    }

    if (caughtError) {
      debugJson['error'] = {
        name: caughtError.name,
        message: caughtError.message,
        stack: caughtError.stack,
      };
    }    
  }

}

