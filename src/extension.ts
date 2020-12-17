import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { ExplorerTree, TreeNode } from './cppExplorer';

export function activate(context: vscode.ExtensionContext)
{
	const cppExplorerInstance = new ExplorerTree(vscode.workspace.rootPath);
	vscode.window.createTreeView('cppExplorer', {treeDataProvider: cppExplorerInstance, showCollapseAll: true});
	vscode.commands.registerCommand('cppExplorer.refresh', () => cppExplorerInstance.refresh());
	vscode.commands.registerCommand('cppExplorer.editEntry', (node: TreeNode) => vscode.window.showInformationMessage(`Successfully called edit entry on ${node.label}.`));
	vscode.commands.registerCommand('cppExplorer.deleteEntry', (node: TreeNode) => vscode.window.showInformationMessage(`Successfully called delete entry on ${node.label}.`));
	vscode.commands.registerCommand('cppExplorer.addProject', (node: TreeNode) => 
	{
		cppExplorerInstance.addProject();
	});
	vscode.commands.registerCommand('cppExplorer.addLibrary', (node: TreeNode) => vscode.window.showInformationMessage(`Successfully called delete entry on ${node.label}.`));
	
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
			fs.mkdir(root+"/libraries", (err) => {});
			let workSpaceName = path.dirname(root);

			fs.writeFile(root+"/CppExplorerOptions.cmake","OPTION(EnableTesting \"Turn on Testing\" ON)\n"
			+ "OPTION(UseInternalKeyword \"Create a keyword `internal` so public elements are only public in library\" ON)"
			,(err) => {});

			fs.writeFile(root+"/CppExplorerDependancies.cmake","", (err) =>{});
			fs.writeFile(root+"/CppExplorerProjects.cmake","", (err) =>{});
			
			fs.writeFile(root+"/CMakeLists.txt", "cmake_minimum_required(VERSION 3.18.0)\n"
			+ "project("+workSpaceName+" VERSION 0.1.0)\n\n"
			+ "include(CppExplorerOptions.cmake)\n"
			+ "include(CppExplorerDependancies.cmake)\n\n"
			+ "if(${EnableTesting})\n"
			+ "    include(CTest)\n"
			+ "    enable_testing()\n"
			+ "endif()\n\n"
			+ "#Determine if 32 or 64 bit\n"
			+ "set(OSBitness 32)\n"
			+ "if(CMAKE_SIZEOF_VOID_P EQUAL 8)\n"
			+ "    set(OSBitness 64)\n"
			+ "endif()\n\n"
			+ "#Save outputs into bin folder\n"
			+ "set(FullOutputDir \"${CMAKE_SOURCE_DIR}/bin/${CMAKE_SYSTEM_NAME}${OSBitness}/${CMAKE_BUILD_TYPE}\")\n"
			+ "set(CMAKE_ARCHIVE_OUTPUT_DIRECTORY \"${FullOutputDir}/static libs\")\n"
			+ "set(CMAKE_LIBRARY_OUTPUT_DIRECTORY ${FullOutputDir})\n"
			+ "set(CMAKE_RUNTIME_OUTPUT_DIRECTORY ${FullOutputDir})\n"
			+ "set(CMAKE_RUNTIME_OUTPUT_DIRECTORY ${FullOutputDir})\n\n"
			+ "include(CppExplorerProjects.cmake)"
			,(err) => {});
			
		}
	});

	context.subscriptions.push(disposable);
}

export function deactivate() {}
