import * as vscode from 'vscode';
import {TreeNodeType} from './TreeNode';


export enum FileType
{
    classType,
    template,
    hpp,
    cpp,
    error
}
export class UserInterface
{
    static async removeFile() : Promise<boolean>
    {
         return await this.yesNoCancelIsFalse(["Don't delete this file.", "Delete this file."]);;
    }

    static async yesNoCancelIsFalse(descriptions?: string[]) : Promise<boolean>
    {
        var option: vscode.QuickPickItem[] = [];
        var desc :string[] = [];
        if(descriptions === undefined)
        {
            desc.push("");
            desc.push("");
        }
        else
        {
            if(descriptions[0] !== undefined)
            {
                desc.push(descriptions[0]);
            }
            else
            {
                desc.push("");
            }
            if(descriptions[1] !== undefined)
            {
                desc.push(descriptions[1]);
            }
            else
            {
                desc.push("");
            }
        }

        option.push({"label":"No", "description": desc[0]});
        option.push({"label": "Yes", "description":desc[1]});
        var result = await vscode.window.showQuickPick(option, {canPickMany: false});
        if(result !== undefined) //Cancelled
        {
            if(result.label === "Yes")
            {
                return true;
            }
        }
        return false;
    }

    static async yesNoCancel(descriptions?: string[]) : Promise<boolean|undefined>
    {
        var option: vscode.QuickPickItem[] = [];
        var desc :string[] = [];
        if(descriptions === undefined)
        {
            desc.push("");
            desc.push("");
        }
        else
        {
            if(descriptions[0] !== undefined)
            {
                desc.push(descriptions[0]);
            }
            else
            {
                desc.push("");
            }
            if(descriptions[1] !== undefined)
            {
                desc.push(descriptions[1]);
            }
            else
            {
                desc.push("");
            }
        }

        option.push({"label":"No", "description": desc[0]});
        option.push({"label": "Yes", "description":desc[1]});
        option.push({"label": "Cancel"});
        var result = await vscode.window.showQuickPick(option, {canPickMany: false});
        if(result !== undefined) //Cancelled
        {
            if(result.label === "Yes")
            {
                return true;
            }
            else if (result.label === "No")
            {
                return false;
            }
        }

        return undefined;
    }

    static async getFromList(list: string[]) : Promise<string>
    {
        var option: vscode.QuickPickItem[] = [];
        var loop;
        for(loop = 0; loop < list.length; loop++)
        {
            option.push({"label" : list[loop]});
        }
        var result = await vscode.window.showQuickPick(option, {canPickMany: false});
        if(result !== undefined)
        {
            return result.label;
        }
        return "";
    }

    static async deleteProject(projectName :string) : Promise<boolean>
    {
        return await this.yesNoCancelIsFalse(["Don't delete project '"+projectName+"'", "Delete project '"+projectName+"'"]);
    }

    static async deleteClass(className :string) : Promise<boolean>
    {
        return await this.yesNoCancelIsFalse(["Don't delete class '"+className+"'", "Delete class '"+className+"'"]);
    }

    static async getFileType() : Promise<FileType>
    {
        var types: vscode.QuickPickItem[] = [];
        types.push({"label":"Class", "description" : "(.hpp and .cpp)"});
        types.push({"label": "Class Template", "description" : "(.hpp only)"});
        types.push({"label": "Empty .hpp"});
        types.push({"label": "Empty .cpp"});
        var fileType = await vscode.window.showQuickPick(types,{canPickMany: false});
        if(fileType === undefined)
        {
            return FileType.error;
        }
        else if(fileType.label === "Class")
        {
            return FileType.classType;
        }
        else if(fileType.label === "Class Template")
        {
            return FileType.template;
        }
        else if(fileType.label === "Empty .hpp")
        {
            return FileType.hpp;
        }
        else //if(fileType.label === "Empty .cpp")
        {
            return FileType.cpp;
        }
    }

    static async prompt(promptMessage: string) : Promise<string>
    {
        var result = await vscode.window.showInputBox({ placeHolder: promptMessage });
        if(result !== undefined)
        {
            return result;
        }
        else
        {
            return "";
        }
    }

    static async getProjectType() : Promise<TreeNodeType>
    {
        var types: vscode.QuickPickItem[] = [];
        types.push({"label":"Executable", "description": "A project that turns into an executable"});
        types.push({"label": "Library", "description": "A project that is a reusable library"});
        var projectType = await vscode.window.showQuickPick(types,{canPickMany: false});
        if(projectType?.label === "Executable")
        {
            return TreeNodeType.executable;
        }
        else if(projectType?.label === "Library")
        {
            return TreeNodeType.library;
        }
        else
        {
            return TreeNodeType.file;
        }
    }
}