import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { ExplorerTree } from './cppExplorer';
import { TreeNode } from './TreeNode';

export function activate(context: vscode.ExtensionContext)
{
	const cppExplorerInstance = new ExplorerTree(vscode.workspace.rootPath);
	vscode.window.createTreeView('cppExplorer', {treeDataProvider: cppExplorerInstance, showCollapseAll: true});
	vscode.commands.registerCommand('cppExplorer.refresh', () => cppExplorerInstance.refresh());
	vscode.commands.registerCommand('cppExplorer.addProject', (node: TreeNode) => cppExplorerInstance.createProject());
	vscode.commands.registerCommand('cppExplorer.addLibrary', (node: TreeNode) => vscode.window.showInformationMessage(`Successfully called delete entry on ${node.label}.`));
	vscode.commands.registerCommand('cppExplorer.addClass', (node: TreeNode) => cppExplorerInstance.createClass(node));
	vscode.commands.registerCommand('cppExplorer.deleteProject', (node: TreeNode) => cppExplorerInstance.deleteProject(node.label?.toString()));
	vscode.commands.registerCommand('cppExplorer.deleteFile', (node: TreeNode) => cppExplorerInstance.deleteFile(node.filePath));
	vscode.commands.registerCommand('cppExplorer.openHpp', (node: TreeNode) => vscode.window.showInformationMessage(`Successfully called delete entry on ${node.label}.`));
	vscode.commands.registerCommand('cppExplorer.openCpp', (node: TreeNode) => vscode.window.showInformationMessage(`Successfully called delete entry on ${node.label}.`));
	vscode.commands.registerCommand('cppExplorer.openFile', (url: string) => vscode.window.showTextDocument(vscode.Uri.file(url)));
	vscode.commands.registerCommand('cppExplorer.deleteBinaries', (node: TreeNode) => cppExplorerInstance.deleteBinaries());
	vscode.commands.registerCommand('cppExplorer.removeCmakeData', (node: TreeNode) => cppExplorerInstance.removeCmakeData());
	vscode.commands.registerCommand('cppExplorer.editWorkspaceProperties', (node: TreeNode) => vscode.window.showTextDocument(vscode.Uri.file(vscode.workspace.rootPath+"/CppExplorerOptions.cmake")));
	vscode.commands.registerCommand('cppExplorer.editProjectProperties', (node: TreeNode) => vscode.window.showTextDocument(vscode.Uri.file(vscode.workspace.rootPath+"/"+node.name+"/CppExplorerOptions.cmake")));

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('cpp-explorer.configure', () => {
		var root = vscode.workspace.rootPath;
		if(root === undefined)
		{
			vscode.window.showInformationMessage('Unable to Configure Workspace: Not in Workspace.');
		}
		else if(fs.existsSync(root+"/CMakeLists.txt"))
		{
			vscode.window.showInformationMessage('Unable to Configure: CMakeLists.txt already exists.');
		}
		else
		{
			cppExplorerInstance.createWorkspace();
		}
	});

	context.subscriptions.push(disposable);
}

export function deactivate() {}
