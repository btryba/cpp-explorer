import * as vscode from 'vscode';
import {TreeNode, TreeNodeType} from './TreeNode';
import {FileSystemInterface} from './FileSystemInterface';
import { realpath } from 'fs';

export class TreeProvider implements vscode.TreeDataProvider<TreeNode>
{
    nodes: TreeNode[];
    //Allow Refresh
    private _onDidChangeTreeData: vscode.EventEmitter<TreeNode|undefined> = new vscode.EventEmitter<TreeNode|undefined>();
    readonly onDidChangeTreeData: vscode.Event<TreeNode|undefined> = this._onDidChangeTreeData.event;
    protected fileSystemInterface: FileSystemInterface;

    constructor(protected workspaceRoot: any)
    {
        this.nodes = [];
        this.workspaceRoot = workspaceRoot;
        this.fileSystemInterface = new FileSystemInterface(workspaceRoot);
    }
    
    //Needed to make interface work
    getTreeItem(element: TreeNode): vscode.TreeItem
    {
		return element;
	}

    getChildren(element?: TreeNode): vscode.ProviderResult<TreeNode[]>
    {
        if (!this.workspaceRoot)
        {
			vscode.window.showInformationMessage('C++ Explorer: Not in a workspace.');
			return Promise.resolve([]);
        }
        else
        {
            if (element === undefined)
            {
                return this.nodes;
            }
            return element.children;
        }
    }


    refresh()
    {
        this.readWorkspace();
        this._onDidChangeTreeData.fire(undefined);
    }

    //Node Motifications
    readWorkspace()
    {
        if(this.fileSystemInterface.rootIsValid())
        {
            if(vscode.workspace.name !== undefined)
            {
                var rootNode: TreeNode = new TreeNode(vscode.workspace.name, TreeNodeType.workSpace, "", this.workspaceRoot);
                this.runProjectEvents();
                this.createTheTree(rootNode);
                this.removeOldProjects(this.nodes[0]);
                this.fileSystemInterface.updateSourcesFiles();
                this.fileSystemInterface.updateExplorerProjectsFile();
            }
        }
    }

    runProjectEvents()
    {
        var projects = this.fileSystemInterface.getProjects();
        var loop;
        for(loop = 0; loop < projects.length; loop++)
        {
            var projectName = projects[loop];
            if(this.fileSystemInterface.getOption("CppEx_EnableInternalKeyword", projectName))
            {
                this.fileSystemInterface.generateInternalHeader(projectName);
            }

            if(this.fileSystemInterface.getOption("CppEx_AutoGenCombinedLibraryHeader", projectName))
            {
               this.fileSystemInterface.generateCombinedHeader(projectName);
            }
        }
    }

    setRootNode(rootNode: TreeNode) : TreeNode
    {
        if(this.nodes.length > 0)
        {
            if(this.nodes[0].label !== vscode.workspace.name)
            {
                this.nodes = [];
                this.nodes.push(rootNode);
            }
            else
            {
                rootNode = this.nodes[0];
            }
        }
        else
        {
            this.nodes = [];
            this.nodes.push(rootNode);
        }
        return rootNode;
    }

    showLibraries(rootNode: TreeNode)
    {
        var libraryNode = new TreeNode("Libraries", TreeNodeType.libraries, "", "");
        if(!rootNode.hasDirectChild("Libraries"))
        {
            rootNode.addChild(libraryNode, 0);
            const stdLib = new TreeNode("Standard C++ Library", TreeNodeType.readonlyLibrary, "", "");
            libraryNode.addChild(stdLib,0);
        }
        else
        {
            if(rootNode.children !== undefined) //never will be undefinded
            {
                libraryNode = rootNode.children[0];
            }
        }
 
        var libraries = this.fileSystemInterface.getLibraries();
        if(libraryNode.children !== undefined)
        {
            if(libraries.length !== libraryNode.children?.length-1)
            {
                while(libraryNode.children.length > 1)
                {
                    libraryNode.children.pop();
                }
                var loop;
                for(loop = 0; loop < libraries.length; loop++)
                {
                    libraryNode.addChild(new TreeNode(libraries[loop], TreeNodeType.readonlyLibrary, libraries[loop], ""), loop+1);
                }
            }
        }
    }

    createTheTree(rootNode: TreeNode)
    {
        var index = 1;
        rootNode = this.setRootNode(rootNode);
        this.showLibraries(rootNode);
        
        var projects = this.fileSystemInterface.getProjects();
        var loop;
        for(loop = 0; loop < projects.length; loop++)
        {
            var fileName = projects[loop];
            if(this.fileSystemInterface.projectIsValid(fileName))
            {
                var node:TreeNode;
                if(this.fileSystemInterface.projectLoaded(fileName))
                {
                    node = this.generateProjectNode(fileName);
                }
                else
                {
                    let unloadedType = TreeNodeType.unloadedExecutable;
                    if(this.fileSystemInterface.getProjectType(fileName) === TreeNodeType.library)
                    {
                        unloadedType = TreeNodeType.unloadedLibrary;
                    }
                    node = new TreeNode(fileName, unloadedType, fileName, this.workspaceRoot+"/"+fileName);
                }
                if(rootNode.hasDirectChild(fileName))
                {
                    let otherNode = rootNode.getChild(fileName);
                    if(otherNode !== undefined)
                    {
                        if(!node.equals(otherNode))
                        {
                            rootNode.removeChild(index);
                            rootNode.addChild(node, index);
                        }
                    }
                }
                else
                {                        
                    rootNode.addChild(node, index);
                }
                index++;
            }
        }

        if(this.nodes.length > 1)
        {
            this.nodes.pop();
        }
        if(this.fileSystemInterface.directoryExists("bin"))
        {
            const binaries = new TreeNode("Binaries", TreeNodeType.binaries, "bin", this.workspaceRoot+"/bin");
            this.nodes.push(binaries);
            this.generateSubDirectoryNodes(binaries, "bin");
        }
    }

    generateSubDirectoryNodes(rootNode: TreeNode, relativeWorkspacePath: string)
    {
        var folders = this.fileSystemInterface.getDirectories(relativeWorkspacePath);
        var index = 0;
        var loop;
        for(loop = 0; loop < folders.length; loop++)
        {
            var folder = folders[loop];
            var folderNode = new TreeNode(folder, TreeNodeType.folder, relativeWorkspacePath+"/"+folder, this.workspaceRoot+"/"+relativeWorkspacePath+"/"+folder);
            rootNode.addChild(folderNode, index);
            index++;
            this.generateSubDirectoryNodes(folderNode, relativeWorkspacePath+"/"+folder);
        }
        
        var files = this.fileSystemInterface.getFiles(relativeWorkspacePath);
        for(loop = 0; loop < files.length; loop++)
        {
            var file = files[loop];
            var fileNode = new TreeNode(file, this.getNodeType(file), relativeWorkspacePath+"/"+file, this.workspaceRoot+"/"+relativeWorkspacePath+"/"+file);
            rootNode.addChild(fileNode, index);
            index++;
        }
    }

    getNodeType(fileName: string) : TreeNodeType
    {
        var nodeType = TreeNodeType.file;
        if(fileName.indexOf(".hpp") !== -1)
        {
            nodeType = TreeNodeType.header;
        }
        else if(fileName.indexOf(".cpp") !== -1)
        {
            nodeType = TreeNodeType.code;
        }

        return nodeType;
    }

    generateProjectNode(projectName: string) : TreeNode
    {
        const projectNode = new TreeNode(projectName, this.fileSystemInterface.getProjectType(projectName), projectName, this.workspaceRoot+"/"+projectName);
        var index = 0;

        const dependancies = new TreeNode("Dependancies", TreeNodeType.dependancies,"", "");
        projectNode.addChild(dependancies, index);
        index++;

        if(this.fileSystemInterface.getOption("CppEx_TestingSectionVisible", projectName))
        {
            const tests = new TreeNode("Tests", TreeNodeType.tests, projectName, this.workspaceRoot+"/"+projectName+"tests");
            projectNode.addChild(tests, index);
            index++;
        }
        this.fileSystemInterface.createMinimumProjectFolders(projectName);
        index = this.generateProjectSubDirectoryNodes(projectNode, projectName, index, "");
        
        this.generateProjectRootFiles(projectName, projectNode, index);

        return projectNode;
    }

    generateProjectRootFiles(projectName: string, projectNode: TreeNode, index: number)
    {
        var rootFiles = this.fileSystemInterface.getFiles(projectName);
        var loop;
        for(loop = 0; loop < rootFiles.length; loop++)
        {
            let fileName = rootFiles[loop];
            if (fileName.toUpperCase() === "LICENSE")
            {
                projectNode.addChild(new TreeNode("LICENSE", TreeNodeType.license, projectName+"/"+fileName, this.workspaceRoot+"/"+projectName+"/"+fileName), index);
            }
            else if(fileName.toUpperCase() === "CMAKELISTS.TXT" || fileName.toUpperCase().indexOf(".CMAKE") !== -1)
            {
                index--; //makes a zero change when index++ is hit.
            } //Don't include these files
            else if(fileName.toUpperCase().indexOf(".HPP") !== -1)
            {
                projectNode.addChild(new TreeNode(fileName, TreeNodeType.header, projectName+"/"+fileName, this.workspaceRoot+"/"+projectName+"/"+fileName), index);
            }
            else if(fileName.toUpperCase().indexOf(".CPP") !== -1)
            {
                projectNode.addChild(new TreeNode(fileName, TreeNodeType.code, projectName+"/"+fileName, this.workspaceRoot+"/"+projectName+"/"+fileName), index);
            }
            else
            {
                projectNode.addChild(new TreeNode(fileName, TreeNodeType.file, projectName+"/"+fileName, this.workspaceRoot+"/"+projectName+"/"+fileName), index);
            }
            index++;
        }
    }

    generateProjectSubDirectoryNodes(rootNode: TreeNode, projectName: string, index: number, nestedPath: string) : number
    {
        var directories = this.fileSystemInterface.getDirectories(projectName+"/include"+nestedPath);
        var loop;
        for(loop = 0; loop < directories.length; loop++)
        {
            let relativePath = projectName+"/include"+nestedPath+directories[loop];
            let folderNode = new TreeNode(directories[loop], TreeNodeType.folder, relativePath, this.workspaceRoot+"/"+relativePath);
            rootNode.addChild(folderNode, index);
            index++;
            this.generateProjectSubDirectoryNodes(folderNode, projectName, 0, "/"+directories[loop]);
        }

        var headerFiles = this.fileSystemInterface.getFiles(projectName+"/include"+nestedPath);
        var sourceFiles = this.fileSystemInterface.getFiles(projectName+"/src"+nestedPath);
        var onlyHeaders :string[] = [];
        var onlySource :string[] =[];
        var classes : string[] = [];
        for(loop = 0; loop < headerFiles.length; loop++)
        {
            var fileName = headerFiles[loop];
            var shortened = fileName.substring(0,fileName.length-4);
            if(sourceFiles.indexOf(shortened+".cpp") === -1)
            {
                onlyHeaders.push(headerFiles[loop]);
            }
            else
            {
                classes.push(shortened);
            }
        }
        for(loop = 0; loop < sourceFiles.length; loop++)
        {
            if(headerFiles.indexOf(sourceFiles[loop].substring(0,sourceFiles[loop].length-4)+".hpp") === -1)
            {
                onlySource.push(sourceFiles[loop]);
            }
        }
        for(loop = 0; loop < onlyHeaders.length; loop++)
        {
            let relativePath = projectName + "/include"+nestedPath+"/"+onlyHeaders[loop];
            rootNode.addChild(new TreeNode(onlyHeaders[loop], TreeNodeType.header, relativePath, this.workspaceRoot+"/"+relativePath), index);
            index++;
        }
        for(loop = 0; loop < classes.length; loop++)
        {
            let relativePath = projectName + "/{include|src}"+nestedPath+"/"+classes[loop]+"{.hpp|.cpp}";
            rootNode.addChild(new TreeNode(classes[loop], TreeNodeType.classType, relativePath, this.workspaceRoot+"/"+relativePath), index);
            index++;
        }
        for(loop = 0; loop < onlySource.length; loop++)
        {
            let relativePath = projectName + "/src"+nestedPath+"/"+onlySource[loop];
            rootNode.addChild(new TreeNode(onlySource[loop], TreeNodeType.code, relativePath, this.workspaceRoot+"/"+relativePath), index);
            index++;
        }

        return index;
    }

    removeOldProjects(rootNode: TreeNode)
    {
        var projects = this.fileSystemInterface.getProjects();
        if(rootNode.children !== undefined)
        {
            var loop;
            for(loop = 0; loop < rootNode.children.length; loop++)
            {
                if(rootNode.children[loop].label !== "Properties" && rootNode.children[loop].label !== "Libraries")
                {
                    var childLabel = rootNode.children[loop].label?.toString();
                    if(childLabel !== undefined)
                    {
                        if(projects.indexOf(childLabel) === -1)
                        {
                            rootNode.removeChild(loop);
                            loop--;
                        }
                    }
                }
            }
        }
    }
}