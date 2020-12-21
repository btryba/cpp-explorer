import * as vscode from 'vscode';

export enum TreeNodeType
{
    workSpace,
    libraries,
    library,
    dependancies,
    classType,
    executable,
    dependancy,
    binaries,
    code,
    header,
    folder,
    license,
    file,
    readonlyLibrary,
    rootfile,
    tests
}

export class TreeNode extends vscode.TreeItem
{
    public children: TreeNode[]|undefined;
    public filePath: string;
    public subPath: string;
    public treeNodeType: TreeNodeType;
    public name:string;

    constructor(label: string, type: TreeNodeType, filePath: string, subPath: string)
    {
        super(label, vscode.TreeItemCollapsibleState.None);

        this.children = [];
        this.filePath = filePath;
        this.treeNodeType = type;
        this.name = label;
        this.subPath = subPath;

        if(type === TreeNodeType.workSpace)
        {
            this.tooltip = "Workspace: "+label;
            this.iconPath = new vscode.ThemeIcon('versions');
            this.contextValue = 'workspace';
        }
        else if(type === TreeNodeType.libraries)
        {
            this.tooltip = "Lirbraries";
            this.iconPath = new vscode.ThemeIcon('library');
            this.contextValue = 'libraries';
        }
        else if(type === TreeNodeType.dependancies)
        {
            this.tooltip = "Project Dependancies";
            this.iconPath = new vscode.ThemeIcon('debug-disconnect');
            this.contextValue = 'dependancies';
        }
        else if(type === TreeNodeType.classType)
        {
            this.tooltip = "Class: "+label;
            this.iconPath = new vscode.ThemeIcon('symbol-class');
            this.contextValue = 'class';
        }
        else if(type === TreeNodeType.executable)
        {
            this.tooltip = "Project: "+label;
            this.iconPath = new vscode.ThemeIcon('server-process');
            this.contextValue = 'executable';
        }
        else if(type === TreeNodeType.readonlyLibrary)
        {
            this.tooltip = "Project: "+label;
            this.iconPath = new vscode.ThemeIcon('repo');
        }
        else if(type === TreeNodeType.library)
        {
            this.tooltip = "Project: "+label;
            this.iconPath = new vscode.ThemeIcon('repo');
            this.contextValue = 'library';
        }
        else if(type === TreeNodeType.dependancy)
        {
            this.iconPath = new vscode.ThemeIcon('repo');
            this.contextValue = 'dependancylibrary';
        }
        else if(type === TreeNodeType.binaries)
        {
            this.tooltip = "Built Files";
            this.iconPath = new vscode.ThemeIcon('file-binary');
            this.contextValue = 'binaries';
        }
        else if(type === TreeNodeType.license)
        {
            this.tooltip = "License";
            this.iconPath = new vscode.ThemeIcon('law');
            this.contextValue = 'file';
            this.description = 'Root File';
        }
        else if(type === TreeNodeType.code)
        {
            this.tooltip = label;
            this.iconPath = new vscode.ThemeIcon('file-code');
            this.contextValue = 'file';
            this.command = { command: 'cppExplorer.openFile', title: "Open File", arguments: [this.filePath] };
        }
        else if(type === TreeNodeType.header)
        {
            this.tooltip = label;
            this.iconPath = new vscode.ThemeIcon('file-text');
            this.contextValue = 'file';
            this.command = { command: 'cppExplorer.openFile', title: "Open File", arguments: [this.filePath] };
        }
        else if(type === TreeNodeType.folder)
        {
            this.iconPath = new vscode.ThemeIcon('folder-opened');
            this.contextValue = 'folder';
        }
        else if(type === TreeNodeType.tests)
        {
            this.iconPath = new vscode.ThemeIcon('beaker');
            this.contextValue = 'tests';
        }
        else if(type === TreeNodeType.rootfile)
        {
            this.iconPath = vscode.ThemeIcon.File;
            this.contextValue = 'file';
            this.description = 'Root File';
            this.command = { command: 'cppExplorer.openFile', title: "Open File", arguments: [this.filePath] };
        }
        else
        {
            this.iconPath = vscode.ThemeIcon.File;
            this.contextValue = 'file';
            this.command = { command: 'cppExplorer.openFile', title: "Open File", arguments: [this.filePath] };
        }
    }

    hasDirectChild(childName: string, asDirectory?: boolean) : boolean
    {
        let retValue = false;
        this.children?.forEach(child =>{
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
        });
        return retValue;
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

    addChild(child: TreeNode, index: number)
    {
        this.children?.splice(index, 0, child);
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