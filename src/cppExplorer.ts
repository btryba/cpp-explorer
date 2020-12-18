import * as vscode from 'vscode';
import {TreeNode, TreeNodeType} from './TreeNode';
import {UserInterface} from './UserInterface';
import {SystemCaller} from './SystemCaller';
import {TreeProvider} from './TreeProvider';

export class ExplorerTree extends TreeProvider
{
    constructor(workspaceRoot: any)
    {
        super(workspaceRoot);
    }

    //Commands
    deleteFile(filePath: string)
    {
        if(filePath !== undefined)
        {
            if(UserInterface.removeFile())
            {
                this.fileSystemInterface.deleteFile(filePath);
                this.refresh();
            }
        }
    }

    createWorkspace()
    {
        this.fileSystemInterface.createWorkspace();
        SystemCaller.initilizeGit(this.workspaceRoot);
        this.refresh();
    }

    deleteBinaries()
    {
        this.fileSystemInterface.deleteBinaries();
        this.refresh();
    }

    removeCmakeData()
    {
        this.fileSystemInterface.removeCmakeData();
        this.refresh();
    }

    async createProject()
    {
        var projectName = await UserInterface.prompt('Enter Project Name');
        var projectType = await UserInterface.getProjectType();

        if(projectType !== TreeNodeType.file)
        {
            this.fileSystemInterface.createProject(projectName, projectType);
            this.refresh();
        }
    }

    async deleteProject(projectName: string|undefined)
    {
        if(projectName !== undefined)
        {
            if(UserInterface.deleteProject(projectName))
            {
                this.fileSystemInterface.deleteFolderRecursive(this.workspaceRoot+"/"+projectName);
                this.refresh();
            }
        }
    }

     async createClass(parent: TreeNode)
     {
    //     var types: vscode.QuickPickItem[] = [];
    //     types.push({"label":"Class", "description" : "(.hpp and .cpp)"});
    //     types.push({"label": "Class Template", "description" : "(.hpp only)"});
    //     types.push({"label": "Empty .hpp"});
    //     types.push({"label": "Empty .cpp"});
    //     var fileType = await vscode.window.showQuickPick(types,{canPickMany: false});
    //     const className = await vscode.window.showInputBox({ placeHolder: 'Enter Class Name' });
    //     if(className !== undefined)
    //     {
    //         if(this.getProjects().indexOf(className) === -1)
    //         {

    //         }
    //     }
    //     this.refresh();
     }
}