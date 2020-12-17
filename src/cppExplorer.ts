import * as vscode from 'vscode';
import * as path from 'path';

export class ExplorerTree implements vscode.TreeDataProvider<TreeNode>
{
    nodes: TreeNode[];
    private _onDidChangeTreeData: vscode.EventEmitter<TreeNode|undefined> = new vscode.EventEmitter<TreeNode|undefined>();

    readonly onDidChangeTreeData: vscode.Event<TreeNode|undefined> = this._onDidChangeTreeData.event;

    refresh(): void
    {
        this._onDidChangeTreeData.fire(undefined);
    }

    constructor(private workspaceRoot: any)
    {
        this.nodes = [];
        const rootNode = new TreeNode(vscode.workspace.name,"workspace");
        const propertiesNode = new TreeNode("Properties","properties");
        const libraryNode = new TreeNode("Libraries","libraries");
        rootNode.addChild(propertiesNode);
        rootNode.addChild(libraryNode);
        this.nodes.push(rootNode);
    }
    
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

    async addProject()
    {
        var projectName = await vscode.window.showInputBox({ placeHolder: 'Enter Project Name' });
        var types: vscode.QuickPickItem[] = [];
        types.push({"label":"Executable"});
        types.push({"label": "Library"});
        var projectType = await vscode.window.showQuickPick(types,{canPickMany: false});
        if(projectName)
        {
            const classNode = new TreeNode(projectName, projectType?.label.toString());
            const properties = new TreeNode("Properties", "properties");
            classNode.addChild(properties);
            const dependancies = new TreeNode("Dependancies", "dependancies");
            classNode.addChild(dependancies);
            this.nodes[0].addChild(classNode);
            this.refresh();
        }
    }

    async addClass()
    {
        const className = await vscode.window.showInputBox({ placeHolder: 'Enter Class Name' });
        if(className)
        {
            const classNode = new TreeNode(className,"class");
            this.nodes[0].addChild(classNode);
            this.refresh();
        }
    }
    
    addNode()
    {

    }
}

export class TreeNode extends vscode.TreeItem
{
    public children: TreeNode[]|undefined;

    constructor(label: string|undefined, type: string|undefined)
    {
        if(label === undefined)
        {
            label = '';
        }

        super(label, vscode.TreeItemCollapsibleState.None);

        this.children = [];

        if(type === 'workspace')
        {
            this.tooltip = "Workspace: "+label;
            this.iconPath = new vscode.ThemeIcon('versions');
            this.contextValue = 'workspace';
        }
        else if(type === 'libraries')
        {
            this.tooltip = "Lirbraries";
            this.iconPath = new vscode.ThemeIcon('library');
            this.contextValue = 'libraries';
        }
        else if(type === 'dependancies')
        {
            this.tooltip = "Project Dependancies";
            this.iconPath = new vscode.ThemeIcon('library');
            this.contextValue = 'dependancies';
        }
        else if(type === 'class')
        {
            this.tooltip = "Class: "+label;
            this.iconPath = new vscode.ThemeIcon('symbol-class');
            this.contextValue = 'class';
        }
        else if(type === 'Executable')
        {
            this.tooltip = "Project: "+label;
            this.iconPath = new vscode.ThemeIcon('server-process');
            this.contextValue = 'executable';
        }
        else if(type === 'Library')
        {
            this.tooltip = "Project: "+label;
            this.iconPath = new vscode.ThemeIcon('repo');
            this.contextValue = 'library';
        }
        else if(type === 'properties')
        {
            this.tooltip = "Properties";
            this.iconPath = new vscode.ThemeIcon('symbol-property');
            this.contextValue = 'properties';
        }
    }

    addChild(child: TreeNode)
    {
        this.children?.push(child);
        super.collapsibleState = vscode.TreeItemCollapsibleState.Expanded;
    }
}