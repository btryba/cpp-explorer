import * as vscode from 'vscode';
import {TreeNode, TreeNodeType} from './TreeNode';
import {UserInterface, FileType} from './UserInterface';
import {SystemCaller} from './SystemCaller';
import {TreeProvider} from './TreeProvider';

export class ExplorerTree extends TreeProvider
{
    constructor(workspaceRoot: any)
    {
        super(workspaceRoot);
        this.readWorkspace();
    }

    //Commands
    async deleteFile(relativeWorkspacePath: string)
    {
        if(relativeWorkspacePath !== undefined)
        {
            if(await UserInterface.removeFile())
            {
                this.fileSystemInterface.deleteFile(relativeWorkspacePath);
                this.refresh();
            }
        }
    }

    async addProjectFolder(node: TreeNode)
    {
        var folderName = await UserInterface.prompt("Folder Name");
        if(folderName !== "")
        {
            if(!this.fileSystemInterface.directoryExists(node.relativeWorkspacePath+"/"+folderName))
            {
                this.fileSystemInterface.createPath(node.relativeWorkspacePath+"/"+folderName);
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
            if(await UserInterface.deleteProject(projectName))
            {
                this.fileSystemInterface.deleteFolderRecursive(this.workspaceRoot+"/"+projectName);
                this.refresh();
            }
        }
    }

     async createClass(parent: TreeNode)
     {
        var fileType = await UserInterface.getFileType();
        var fileName = "";
        if(fileType === FileType.classType)
        {
            fileName = await UserInterface.prompt('Enter Class Name');
            if(fileName !== "")
            {
                this.fileSystemInterface.createHeaderFile(parent.relativeWorkspacePath+"/include/"+fileName+".hpp", parent.name, fileName);
                this.fileSystemInterface.createImplementationFile(parent.relativeWorkspacePath+"/src/"+fileName+".cpp", parent.name, fileName);
            }
        }
        else if(fileType === FileType.template)
        {
            fileName = await UserInterface.prompt('Enter Class Template Name');
            if(fileName !== "")
            {
                this.fileSystemInterface.createTemplateFile(parent.relativeWorkspacePath+"/include/"+fileName+".hpp", parent.name, fileName);
            }
        }
        else if(fileType === FileType.hpp)
        {
            fileName = await UserInterface.prompt('Enter .hpp file name');
            if(fileName !== "")
            {
                this.fileSystemInterface.createHeaderFile(parent.relativeWorkspacePath+"/include/"+fileName+".hpp", parent.name, "");
            }
        }
        else if(fileType === FileType.cpp)
        {
            fileName = await UserInterface.prompt('Enter .cpp file name');
            if(fileName !== "")
            {
                this.fileSystemInterface.createImplementationFile(parent.relativeWorkspacePath+"/src/"+fileName+".cpp", parent.name, "");
            }
        }
        else
        {
            return;
        }

        this.refresh();
     }
}