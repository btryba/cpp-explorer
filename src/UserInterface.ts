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
        var option: vscode.QuickPickItem[] = [];
        option.push({"label":"No", "description": "Don't delete this file."});
        option.push({"label": "Yes", "description":"Delete this file."});
        var result = await vscode.window.showQuickPick(option, {canPickMany: false});
        if(result !== undefined)
        {
            if(result.label === "Yes")
            {
                return true;
            }
        }
        return false;
    }

    static async deleteProject(projectName :string) : Promise<boolean>
    {
        var option: vscode.QuickPickItem[] = [];
        option.push({"label":"No", "description":"Don't delete project '"+projectName+"'"});
        option.push({"label": "Yes", "description":"Delete project '"+projectName+"'"});
        var result = await vscode.window.showQuickPick(option, {canPickMany: false});
        if(result !== undefined)
        {
            if(result.label === "Yes")
            {
                return true;
            }
        }
        return false;
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