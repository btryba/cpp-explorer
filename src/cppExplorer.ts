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
            this.fileSystemInterface.addProjectFolder(node.relativeWorkspacePath, folderName);
            this.refresh();
        }
    }

    async addBatchTest(node: TreeNode)
    {
        var batchName = await UserInterface.prompt("Batch Test Name");
        if(batchName !== "")
        {
            var projectName = node.relativeWorkspacePath;
            this.fileSystemInterface.addBatchTest(projectName, batchName);

            this.refresh();
        }
    }

    async addLicenseFull()
    {
        var projects = this.fileSystemInterface.getProjects();
        var projectName = await UserInterface.getFromList(projects);
        if(projectName !== "")
        {
            this.fileSystemInterface.createLicense(projectName);
            this.refresh();
        }
    }

    addLicense(node: TreeNode)
    {
        this.fileSystemInterface.createLicense(node.relativeWorkspacePath);
        this.refresh();
    }

    async createWorkspace()
    {
        var makeGit :boolean|undefined;
        var configure: boolean|undefined;
        if((makeGit = await UserInterface.yesNoCancel(["Don't Create git repo", "Create git repo"])) !== undefined)
        {
            if((configure = await UserInterface.yesNoCancel(["Don't initialize CMake (Pick this if using CMake-Tools)", "Initialize CMake (Pick this if you are manually running Ninja)"])) !== undefined)
            {
                this.fileSystemInterface.createWorkspace();
                if(makeGit)
                {
                    SystemCaller.initilizeGit(this.workspaceRoot);
                }
                if(configure)
                {
                    SystemCaller.runCMake(this.workspaceRoot);
                }
                this.refresh();
            }
        }
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

    unloadProject(node: TreeNode)
    {
        this.fileSystemInterface.unloadProject(node.relativeWorkspacePath);
        this.refresh();
    }

    reloadProject(node: TreeNode)
    {
        this.fileSystemInterface.reloadProject(node.relativeWorkspacePath);
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
                this.fileSystemInterface.createHeaderFile(parent.relativeWorkspacePath+"/include/"+fileName+".hpp", parent.name, fileName, true);
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
                this.fileSystemInterface.createHeaderFile(parent.relativeWorkspacePath+"/include/"+fileName+".hpp", parent.name, fileName, false);
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