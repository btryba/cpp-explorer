import * as vscode from 'vscode';

export enum TreeNodeType
{
    workSpace,
    libraries,
    readonlyLibrary,

    unloadedExecutable,
    unloadedLibrary,

    library,
    executable,
    dependancies,
    dependancy,
    tests,
    nonCodeFolder,
    folder,
    license,
    
    classType,
    header,
    code,

    binaries,
    file
}

export class TreeNode extends vscode.TreeItem
{
    public children: TreeNode[]|undefined;
    public relativeWorkspacePath: string;
    public fullPath: string;
    public treeNodeType: TreeNodeType;
    public name:string;

    constructor(label: string, type: TreeNodeType, relativeWorkspacePath: string, fullPath:string)
    {
        super(label, vscode.TreeItemCollapsibleState.None);

        this.children = [];
        this.relativeWorkspacePath = relativeWorkspacePath;
        this.treeNodeType = type;
        this.name = label;
        this.fullPath = fullPath;

        this.setType(type, label);
    }

    hasDirectChild(childName: string, asDirectory?: boolean) : boolean
    {
        let retValue = false;
        var loop;
        if(this.children !== undefined)
        {
            for(loop = 0; loop < this.children?.length; loop++)
            {
                var child = this.children[loop];
                if(retValue === false)
                {
                    if(child.label === childName)
                    {
                        if(asDirectory !== undefined)
                        {
                            if(asDirectory === true && child.treeNodeType === TreeNodeType.folder)
                            {
                                retValue = true;
                            }
                            else if (asDirectory !== true && child.treeNodeType !== TreeNodeType.folder)
                            {
                                retValue = true;
                            }
                        }
                        else
                        {
                            retValue = true;
                        }
                    }
                }
            }
        }
        return retValue;
    }

    setType(type: TreeNodeType, label :string)
    {
        if(type === TreeNodeType.workSpace)
        {
            this.tooltip = "Workspace: "+label;
            this.iconPath = new vscode.ThemeIcon('versions');
            this.contextValue = "workspace";
        }
        else if(type === TreeNodeType.libraries)
        {
            this.tooltip = "Libraries";
            this.iconPath = new vscode.ThemeIcon('library');
            this.contextValue = "libraries";
        }
        else if(type === TreeNodeType.dependancies)
        {
            this.tooltip = "Project Dependancies";
            this.iconPath = new vscode.ThemeIcon('debug-disconnect');
            this.contextValue = "dependancies";
        }
        else if(type === TreeNodeType.classType)
        {
            this.tooltip = this.relativeWorkspacePath;
            this.iconPath = new vscode.ThemeIcon('symbol-class');
            this.contextValue = "class";
        }
        else if(type === TreeNodeType.executable)
        {
            this.tooltip = "Project: "+label;
            this.iconPath = new vscode.ThemeIcon('server-process');
            this.contextValue = "executable";
        }
        else if(type === TreeNodeType.unloadedExecutable)
        {
            this.tooltip = "Project: "+label;
            this.description = "(unloaded)";
            this.iconPath = new vscode.ThemeIcon('server-process');
            this.contextValue = "unloadedExecutable";
        }
        else if(type === TreeNodeType.readonlyLibrary)
        {
            this.tooltip = "Project: "+label;
            this.iconPath = new vscode.ThemeIcon('repo');
            this.contextValue = "readonlyLibrary";
        }
        else if(type === TreeNodeType.library)
        {
            this.tooltip = "Project: "+label;
            this.iconPath = new vscode.ThemeIcon('repo');
            this.contextValue = "library";
        }
        else if(type === TreeNodeType.unloadedLibrary)
        {
            this.tooltip = "Project: "+label;
            this.description = "(unloaded)";
            this.iconPath = new vscode.ThemeIcon('repo');
            this.contextValue = "unloadedLibrary";
        }
        else if(type === TreeNodeType.dependancy)
        {
            this.iconPath = new vscode.ThemeIcon('repo');
            this.contextValue = "dependancy";
        }
        else if(type === TreeNodeType.binaries)
        {
            this.tooltip = "Built Files";
            this.iconPath = new vscode.ThemeIcon('file-binary');
            this.contextValue = "binaries";
        }
        else if(type === TreeNodeType.license)
        {
            this.tooltip = this.relativeWorkspacePath;
            this.iconPath = new vscode.ThemeIcon('law');
            this.contextValue = 'file';
        }
        else if(type === TreeNodeType.code)
        {
            this.tooltip = this.relativeWorkspacePath;
            this.iconPath = new vscode.ThemeIcon('file-code');
            this.command = { command: 'cppExplorer.openProjectFile', title: "Open File", arguments: [this.relativeWorkspacePath] };
            this.contextValue = "code";
        }
        else if(type === TreeNodeType.header)
        {
            this.tooltip = this.relativeWorkspacePath;
            this.iconPath = new vscode.ThemeIcon('file-text');
            this.command = { command: 'cppExplorer.openProjectFile', title: "Open File", arguments: [this.relativeWorkspacePath] };
            this.contextValue = "header";
        }
        else if(type === TreeNodeType.folder)
        {
            this.tooltip = this.relativeWorkspacePath;
            this.iconPath = new vscode.ThemeIcon('folder-opened');
            this.contextValue = "folder";
        }
        else if(type === TreeNodeType.nonCodeFolder)
        {
            this.tooltip = this.relativeWorkspacePath;
            this.iconPath = new vscode.ThemeIcon('root-folder');
            this.contextValue = "rootFolder";
        }
        else if(type === TreeNodeType.tests)
        {
            this.iconPath = new vscode.ThemeIcon('beaker');
            this.contextValue = "tests";
        }
        else
        {
            this.tooltip = this.relativeWorkspacePath;
            this.iconPath = vscode.ThemeIcon.File;
            this.contextValue = 'file';
            this.command = { command: 'cppExplorer.openFileFullPath', title: "Open File", arguments: [this.fullPath] };
        }
    }

    getChild(childName: string, asDirectory?: boolean) : TreeNode|undefined
    {
        var retValue: TreeNode|undefined = undefined;
        this.children?.forEach(child =>{
            if(retValue === undefined)
            {
                if(child.label === childName)
                {
                    if(asDirectory !== undefined)
                    {
                        if(asDirectory === true && child.contextValue === "folder")
                        {
                            retValue = child;
                        }
                        else if (asDirectory !== true && child.contextValue !== "folder")
                        {
                            retValue = child;
                        }
                    }
                    else
                    {
                        retValue = child;
                    }
                }
            }
        });
        return retValue;
    }

    addChild(child: TreeNode, index?: number)
    {
        if(index === undefined)
        {
            this.children?.push(child);
        }
        else
        {
            this.children?.splice(index, 0, child);
        }
        super.collapsibleState = vscode.TreeItemCollapsibleState.Expanded;
    }

    removeChild(index: number)
    {
        if(this.children !== undefined)
        {
            if (index > -1 && this.children?.length > index) 
            {
                this.children?.splice(index, 1);
            }
        }
    }

    equals(otherNode: TreeNode) : boolean
    {
        if(this.contextValue !== otherNode.contextValue)
        {
            return false;
        }
        if(this.children !== undefined)
        {
            if(otherNode.children !== undefined)
            {
                if(this.children.length === otherNode.children.length)
                {
                    var loop;
                    for(loop = 0; loop < this.children.length; loop++)
                    {
                        if(!this.children[loop].equals(otherNode.children[loop]))
                        {
                            return false;
                        }
                    }
                }
                else
                {
                    return false;
                }
            }
            else
            {
                return false;
            }
        }

        if(this.label !== otherNode.label || this.contextValue !== otherNode.contextValue)
        {
            return false;
        }

        return true;
    }
}