import * as vscode from 'vscode';
import {TreeNode, TreeNodeType} from './TreeNode';
import {FileSystemInterface} from './FileSystemInterface';

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
        this.readWorkspace();
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


    refresh(): void
    {
        this.readWorkspace();
        this._onDidChangeTreeData.fire(undefined);
    }

    //Node Motifications
    readWorkspace()
    {
        if(this.fileSystemInterface.rootIsValid())
        {
            var rootNode: TreeNode = new TreeNode(vscode.workspace.name, TreeNodeType.workSpace, this.workspaceRoot);;
            this.runProjectEvents();
            this.createTheTree(rootNode);
            this.removeOldProjects(rootNode);
            this.fileSystemInterface.updateSourcesFiles();
            this.fileSystemInterface.updateExplorerProjectsFile();
        }
    }

    runProjectEvents()
    {
        var projects = this.fileSystemInterface.getProjects();
        var loop;
        for(loop = 0; loop < projects.length; loop++)
        {
            var projectName = projects[loop];
            if(this.fileSystemInterface.getOption("EnableInternalKeyword", projectName))
            {
                this.fileSystemInterface.generateInternalHeader(projectName);
            }

            if(this.fileSystemInterface.getOption("AutoGenCombinedLibraryHeader", projectName))
            {
               this.fileSystemInterface.generateCombinedHeader(projectName);
            }
        }
    }

    createTheTree(rootNode: TreeNode)
    {
        var index = 0;
        if(this.nodes.length > 1)
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

        if(!rootNode.hasDirectChild("Libraries"))
        {
            const libraryNode = new TreeNode("Libraries", TreeNodeType.libraries, "");
            rootNode.addChild(libraryNode, index);
            const stdLib = new TreeNode("Standard C++ Library", TreeNodeType.readonlyLibrary, "");
            libraryNode.addChild(stdLib,0);
        }
        index++;

        this.fileSystemInterface.getProjects().forEach(async fileName => {
            if(this.fileSystemInterface.projectIsValid(fileName))
            {
                const node = await this.generateProjectNode(fileName);
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
        });

        if(this.nodes.length > 1)
        {
            this.nodes.pop();
        }
        if(this.fileSystemInterface.directoryExists(this.workspaceRoot+"/bin"))
        {
            const binaries = new TreeNode("Binaries", TreeNodeType.binaries, this.workspaceRoot+"/bin");
            this.nodes.push(binaries);
        }
    }

    async generateProjectNode(projectName: string) : Promise<TreeNode>
    {
        const projectNode = new TreeNode(projectName, await this.fileSystemInterface.getProjectType(projectName), this.workspaceRoot+"/"+projectName);
        var index = 0;

        const dependancies = new TreeNode("Dependancies", TreeNodeType.dependancies,"");
        projectNode.addChild(dependancies, index);
        index++;

        var directories = this.fileSystemInterface.getDirectories(this.workspaceRoot+"/"+projectName);
        var loop;
        for(loop = 0; loop < directories.length; loop++)
        {
            if(directories[loop].toUpperCase() === "INCLUDE" || directories[loop].toUpperCase() === "SRC")
            {
                index--;
            }
            else
            {
                projectNode.addChild(new TreeNode(directories[loop], TreeNodeType.folder, this.workspaceRoot+"/"+projectName+"/"+directories[loop]), index);
                index++;
            }
        }

        var files = this.fileSystemInterface.getFiles(this.workspaceRoot+"/"+projectName);
        for(loop = 0; loop < files.length; loop++)
        {
            var fileName = files[loop];
            if(!projectNode.hasDirectChild(fileName, false))
            {
                if (fileName.toUpperCase() === "LICENSE")
                {
                    projectNode.addChild(new TreeNode("LICENSE", TreeNodeType.license, this.workspaceRoot+"/"+projectName+"/"+fileName), index);
                }
                else if(fileName.toUpperCase() === "CMAKELISTS.TXT" || fileName.toUpperCase().indexOf(".CMAKE") !== -1)
                {
                    index--; //makes a zero change when index++ is hit.
                } //Don't include this file
                else
                {
                    projectNode.addChild(new TreeNode(fileName, TreeNodeType.file, this.workspaceRoot+"/"+projectName+"/"+fileName), index);
                }
            }
            index++;
        }
        
        return projectNode;
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