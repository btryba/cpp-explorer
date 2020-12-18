import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as readline from 'readline';
import * as child_process from 'child_process';
import * as os from 'os';

export class ExplorerTree implements vscode.TreeDataProvider<TreeNode>
{
    nodes: TreeNode[];
    //Allow Refresh
    private _onDidChangeTreeData: vscode.EventEmitter<TreeNode|undefined> = new vscode.EventEmitter<TreeNode|undefined>();
    readonly onDidChangeTreeData: vscode.Event<TreeNode|undefined> = this._onDidChangeTreeData.event;

    constructor(private workspaceRoot: any)
    {
        this.nodes = [];
        this.workspaceRoot = workspaceRoot;
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

    //Private methods
    private getProjects() : string[]
    {
        let projects: string[] = [];
        fs.readdirSync(this.workspaceRoot).forEach(async file => {
            let fileName = path.basename(file);
            if(fileName.substring(0,1) !== "." && fileName !== 'libraries' && fileName !== 'build' && fileName !== 'bin' && fs.lstatSync(this.workspaceRoot+"/"+fileName).isDirectory() )
            {
                projects.push(fileName);
            }
        });
        return projects;
    }

    private async getProjectType(projectName: string) : Promise<string>
    {
        const fileStream = fs.createReadStream(this.workspaceRoot+"/"+projectName+"/CMakeLists.txt");

        const rl = readline.createInterface({
            input: fileStream,
            crlfDelay: Infinity
        });

        for await (const line of rl)
        {
            if(line.indexOf("add_library(") !== -1)
            {
                return "Library";
            }
        }
        return "Executable";
    }

    //Node Motifications
    readWorkspace()
    {
        if(this.pathExists(this.workspaceRoot+"/CMakeLists.txt"))
        {
            var rootNode: TreeNode = new TreeNode(vscode.workspace.name,"workspace",this.workspaceRoot);;
            this.runProjectEvents();
            this.createTheTree(rootNode);
            this.removeOldProjects(rootNode);
            this.updateSourcesFiles();
            this.updateExplorerProjectsFile();
        }
    }

    runProjectEvents()
    {
        var projects = this.getProjects();
        var loop;
        for(loop = 0; loop < projects.length; loop++)
        {
            var internalkey = this.getOption("EnableInternalKeyword", projects[loop]);
            if(internalkey)
            {
                var internalPath = this.workspaceRoot+"/"+projects[loop]+"/include/InternalKeyword.hpp";
                if(!this.pathExists(internalPath))
                {
                    fs.writeFileSync(internalPath,
                    "#ifndef INTERNALKEYWORD_HPP\n"
                    + "    #define INTERNALKEYWORD_HPP\n\n"
                    + "    #ifndef "+projects[loop].toUpperCase()+"INTERNAL\n"
                    + "        #define _internal public\n"
                    + "    #else\n"
                    + "        #define _internal private\n"
                    + "    #endif\n"
                    + "#endif\n");
                }
            }

            if(this.getOption("AutoGenCombinedLibraryHeader", projects[loop]))
            {
                var list :string[]= [];
                list = this.makeListFiles(this.workspaceRoot+"/"+projects[loop], list, ".hpp");
                var fileContents = "#ifndef "+projects[loop].toUpperCase()+"_HPP\n"
                + "#define "+projects[loop].toUpperCase()+"_HPP\n\n";
                if(internalkey)
                {
                    fileContents += "    #undef _internal\n";   
                    fileContents += "    #define "+projects[loop].toUpperCase()+"INTERNAL\n\n";   
                }
                var includeLoop;
                for(includeLoop = 0; includeLoop < list.length; includeLoop++)
                {
                    var shortenedName = list[includeLoop].substring(this.workspaceRoot.length+projects[loop].length+2);
                    fileContents += "    #include \""+shortenedName+"\"\n";
                }
                fileContents += "\n";
                if(internalkey)
                {
                    fileContents += "    #undef _internal\n";   
                    fileContents += "    #undef "+projects[loop].toUpperCase()+"INTERNAL\n\n";   
                }
                fileContents += "#endif //"+projects[loop].toUpperCase()+"_HPP\n";
                this.writeFile(projects[loop]+"/"+projects[loop]+".hpp",fileContents);
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

        if(!rootNode.hasDirectChild("Properties"))
        {
            const propertiesNode = new TreeNode("Properties","properties",this.workspaceRoot+"/CppExplorerOptions.cmake");
            rootNode.addChild(propertiesNode, index);
        }
        index++;
        if(!rootNode.hasDirectChild("Libraries"))
        {
            const libraryNode = new TreeNode("Libraries","libraries","");
            rootNode.addChild(libraryNode, index);
            const stdLib = new TreeNode("Standard C++ Library", "dependancylibrary","");
            libraryNode.addChild(stdLib,0);
        }
        index++;
        this.createPath("libraries");

        this.getProjects().forEach(async fileName => {
            if(this.pathExists(this.workspaceRoot+"/"+fileName+"/CMakeLists.txt"))
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
        if(this.pathExists(this.workspaceRoot+"/bin") && fs.lstatSync(this.workspaceRoot+"/bin").isDirectory() )
        {
            const binaries = new TreeNode("Binaries","binaries",this.workspaceRoot+"/bin");
            this.nodes.push(binaries);
        }
    }

    async generateProjectNode(projectName: string) : Promise<TreeNode>
    {
        const projectNode = new TreeNode(projectName, await this.getProjectType(projectName), this.workspaceRoot+"/"+projectName);
        var index = 0;

        const properties = new TreeNode("Properties", "properties",this.workspaceRoot+"/"+projectName+"/CppExplorerOptions.cmake");
        projectNode.addChild(properties, index);
        index++;
        
        const dependancies = new TreeNode("Dependancies", "dependancies","");
        projectNode.addChild(dependancies, index);
        index++;
        
        fs.readdirSync(this.workspaceRoot+"/"+projectName).forEach(async file => {
            let fileName = path.basename(file);
            var isDirectory = fs.lstatSync(this.workspaceRoot+"/"+projectName+"/"+fileName).isDirectory();
            if(isDirectory)
            {
                if(!projectNode.hasDirectChild(fileName, true))
                {
                    if(fileName.toUpperCase() === "INCLUDE" || fileName.toUpperCase() === "SRC")
                    {
                        index--;
                    }
                    else
                    {
                        projectNode.addChild(new TreeNode(fileName, "folder",this.workspaceRoot+"/"+projectName+"/"+fileName), index);
                    }
                }
            }
            index++;
        });

        fs.readdirSync(this.workspaceRoot+"/"+projectName).forEach(async file => {
            let fileName = path.basename(file);
            var isDirectory = fs.lstatSync(this.workspaceRoot+"/"+projectName+"/"+fileName).isDirectory();
            if(!isDirectory)
            {
                if(!projectNode.hasDirectChild(fileName, false))
                {
                    if (fileName.toUpperCase() === "LICENSE")
                    {
                        projectNode.addChild(new TreeNode("LICENSE", "license",this.workspaceRoot+"/"+projectName+"/"+fileName), index);
                    }
                    else if(fileName.toUpperCase() === "CMAKELISTS.TXT" || fileName.toUpperCase().indexOf(".CMAKE") !== -1)
                    {
                        index--; //makes a zero change when index++ is hit.
                    } //Don't include this file
                    else
                    {
                        projectNode.addChild(new TreeNode(fileName, "file",this.workspaceRoot+"/"+projectName+"/"+fileName), index);
                    }
                }
            }
            index++;
        });

        return projectNode;
    }

    //System Calls
    private initilizeGit()
    {
        var extension = "";
        if(os.platform() === "win32")
        {
            extension = ".exe";
        }
        child_process.exec("git"+extension+" -C \""+this.workspaceRoot+"\" init");
        child_process.exec("git"+extension+" -C \""+this.workspaceRoot+"\" submodule init");
    }

    runCMake()
    {
        //mkdir build
        //cd build
        //cmake .. -G Ninja
        //ninja -v
        ////check bin output
        this.refresh();
        //run bin
    }

    //IO Methods
    async getOption(optionName:string, projectName: string) : Promise<boolean>
    {
        var fullPath = this.workspaceRoot+"/"+projectName+"/CppExplorerOptions.cmake";
        var retVal = false;
        if(this.pathExists(fullPath))
        {
            const fileStream = fs.createReadStream(fullPath);

            const rl = readline.createInterface({
                input: fileStream,
                crlfDelay: Infinity
            });

            for await (const line of rl)
            {
                if(line.indexOf("OPTION("+optionName) !== -1)
                {
                    if(line.indexOf("ON)") !== -1)
                    {
                        retVal = true;
                        break;
                    }
                }
            }
        }
        return retVal;
    }

    createPath(pathName: string)
    {
        if(!this.pathExists(this.workspaceRoot+"/"+pathName))
        {
            fs.mkdir(this.workspaceRoot+"/"+pathName, (err) => {});
        }
    }

    deleteBinaries()
    {
        this.deleteFolderRecursive(this.workspaceRoot+"/bin");
        this.refresh();
    }

    removeCmakeData()
    {
        this.deleteFolderRecursive(this.workspaceRoot+"/bin");
        this.deleteFolderRecursive(this.workspaceRoot+"/build");
        this.refresh();
    }

    updateExplorerProjectsFile()
    {
        var projects = this.getProjects();
        var loop;
        var fileContents = "";
        for(loop = 0; loop < projects.length; loop++)
        {
            fileContents += "add_subdirectory(\""+projects[loop]+"\")\n";
        }
        this.writeFile("CppExplorerProjects.cmake", fileContents);
    }

    updateSourcesFiles()
    {
        var projects = this.getProjects();
        var loop;
        for(loop = 0; loop < projects.length; loop++)
        {
            if(this.pathExists(this.workspaceRoot+"/"+projects[loop]))
            {
                var list :string[] = [];
                list = this.makeListFiles(this.workspaceRoot+"/"+projects[loop],list,".cpp");
                var fileIndex;
                var fileContents = "set(SourceFiles \n";
                for(fileIndex = 0; fileIndex < list.length; fileIndex++)
                {
                    var shortenedName = list[fileIndex].substring(this.workspaceRoot.length+projects[loop].length+2);
                    fileContents += shortenedName+"\n";
                }
                fileContents += ")";
                this.writeFile(projects[loop]+"/SourceFiles.cmake",fileContents);
            }
        }
    }

    makeListFiles(initialPath: string, list: string[], ext: string) : string[]
    {
        var newList = list;
        if (fs.existsSync(initialPath))
        {
            fs.readdirSync(initialPath).forEach((file, index) => {
                const curPath = path.join(initialPath, file);
                if (fs.lstatSync(curPath).isDirectory())
                {
                    newList = this.makeListFiles(curPath, newList, ext);
                } 
                else
                { 
                    if(curPath.indexOf(ext) !== -1)
                    {
                        newList.push(curPath);
                    }
                }
              });
        }
        return newList;
    }

    async deleteProject(projectName: string|undefined)
    {
        if(projectName !== undefined)
        {
            var option: vscode.QuickPickItem[] = [];
            option.push({"label":"No", "description":"Don't delete project '"+projectName+"'"});
            option.push({"label": "Yes", "description":"Delete project '"+projectName+"'"});
            var result = await vscode.window.showQuickPick(option, {canPickMany: false});
            if(result !== undefined)
            {
                if(result.label === "Yes")
                {
                    if(this.pathExists(this.workspaceRoot+"/"+projectName))
                    {
                        this.deleteFolderRecursive(this.workspaceRoot+"/"+projectName);
                        this.refresh();
                    }
                }
            }
        }
    }

    deleteFolderRecursive(toDelete: string) {
        if (fs.existsSync(toDelete)) {
          fs.readdirSync(toDelete).forEach((file, index) => {
            const curPath = path.join(toDelete, file);
            if (fs.lstatSync(curPath).isDirectory()) { // recurse
                this.deleteFolderRecursive(curPath);
            } else { // delete file
              fs.unlinkSync(curPath);
            }
          });
          fs.rmdirSync(toDelete);
        }
      };

    removeOldProjects(rootNode: TreeNode)
    {
        var projects = this.getProjects();
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

    async createProject()
    {
        var projectName = await vscode.window.showInputBox({ placeHolder: 'Enter Project Name' });
        var types: vscode.QuickPickItem[] = [];
        types.push({"label":"Executable", "description": "A project that turns into an executable"});
        types.push({"label": "Library", "description": "A project that is a reusable library"});
        var projectType = await vscode.window.showQuickPick(types,{canPickMany: false});
        if(projectName && projectType !== undefined)
        {
            if(this.getProjects().indexOf(projectName) !== -1)
            {
                vscode.window.showErrorMessage("Project "+projectName+" already exists.");
                return;
            }
            var projectRoot = this.workspaceRoot+"/"+projectName;
            this.createPath(projectName);
            this.createPath(projectName+"/include");
            this.createPath(projectName+"/src");

            fs.writeFile(projectRoot+"/SourceFiles.cmake","", (err) =>{});
            
            let fileContents = "include(CppExplorerOptions.cmake)\n"
            + "cmake_minimum_required(VERSION ${MinimumCMakeVersion})\n"
            + "project(${ProjectName} VERSION 0.1.0)\n\n"
            + "include_directories(\"include\")\n"
            + "include_directories(\"..\")\n\n"
            + "include_directories(\"../libraries\")\n\n"
            + "#Add all the source files to build library\n"
            + "include(\"${CMAKE_CURRENT_SOURCE_DIR}/SourceFiles.cmake\")\n\n";
    
            if(projectType.label === "Executable")
            {
                fileContents += "add_executable(${PROJECT_NAME} ${SourceFiles})\n\n";
            }
            else
            {
                fileContents += "add_library(${PROJECT_NAME} SHARED ${SourceFiles})\n"
                + "add_library(${PROJECT_NAME}_STATIC STATIC ${SourceFiles})\n\n";
            }

            fileContents += "if(${CMAKE_SYSTEM_NAME} STREQUAL \"Windows\")\n"
            + "    if(NOT ${WindowsPreBuildCommand} STREQUAL \"\")\n"
            + "        add_custom_command(TARGET ${PROJECT_NAME}\n"
            + "            PRE_BUILD COMMAND\n"
            + "            ${WindowsPreBuildCommand}\n"
            + "        )\n"
            + "    endif()\n"
            + "    if(NOT ${WindowsPostBuildCommand} STREQUAL \"\")\n"
            + "        add_custom_command(TARGET ${PROJECT_NAME}\n"
            + "            POST_BUILD COMMAND\n"
            + "            ${WindowsPostBuildCommand}\n"
            + "        )\n"
            + "    endif()\n"
            + "else()\n"
            + "    if(NOT ${UnixPreBuildCommand} STREQUAL \"\")\n"
            + "        add_custom_command(TARGET ${PROJECT_NAME}\n"
            + "            PRE_BUILD COMMAND\n"
            + "            ${UnixPreBuildCommand}\n"
            + "        )\n"
            + "    endif()\n"
            + "    if(NOT ${UnixPostBuildCommand} STREQUAL \"\")\n"
            + "        add_custom_command(TARGET ${PROJECT_NAME}\n"
            + "            POST_BUILD COMMAND\n"
            + "            ${UnixPostBuildCommand}\n"
            + "        )\n"
            + "    endif()\n"
            + "endif()";

            this.writeFile(projectName+"/CMakeLists.txt", fileContents);

            if(projectType?.label === "Executable")
            {
                fs.writeFile(projectRoot+"/main.cpp","int main(int argCount, char *argValues[])\n{\n\n    return 0;\n}", (err) =>{});
            }

            this.writeFile(projectName+"/CppExplorerOptions.cmake",
            "set(ProjectName "+projectName+")\n"
            + "set(ProjectVersion 1.0.0)\n"
            + "OPTION(EnableInternalKeyword \"Creates an _internal keyword for more access control\" ON)\n"
            + "OPTION(AutoGenCombinedLibraryHeader \"For library projects, create a combined header\" ON)\n"
            + "\n"
            + "## Symbol && can be used to run multiple commands ##\n"
            + "set(WindowsPreBuildCommand \"\")\n"
            + "set(WindowsPostBuildCommand \"\")\n"
            + "set(UnixPreBuildCommand \"\")\n"
            + "set(UnixPostBuildCommand \"\")\n"
            );
        }
        this.refresh();
    }

    async createClass(parent: TreeNode)
    {
        var types: vscode.QuickPickItem[] = [];
        types.push({"label":"Class", "description" : "(.hpp and .cpp)"});
        types.push({"label": "Class Template", "description" : "(.hpp only)"});
        types.push({"label": "Empty .hpp"});
        types.push({"label": "Empty .cpp"});
        var fileType = await vscode.window.showQuickPick(types,{canPickMany: false});
        const className = await vscode.window.showInputBox({ placeHolder: 'Enter Class Name' });
        if(className !== undefined)
        {
            if(this.getProjects().indexOf(className) === -1)
            {

            }
        }
        this.refresh();
    }

    async deleteFile(filePath: string)
    {
        if(filePath !== undefined)
        {
            var option: vscode.QuickPickItem[] = [];
            option.push({"label":"No", "description": "Don't delete this file."});
            option.push({"label": "Yes", "description":"Delete this file."});
            var result = await vscode.window.showQuickPick(option, {canPickMany: false});
            if(result !== undefined)
            {
                if(result.label === "Yes")
                {
                    fs.unlinkSync(filePath);
                    this.refresh();
                }
            }
        }
    }

    async createWorkspace()
    {
        this.createPath("libraries");
        this.writeFile("CppExplorerOptions.cmake","set(MinimumCMakeVersion 3.0.0)\n"
        + "OPTION(EnableTesting \"Turn on Testing\" ON)\n");
        this.writeFile("CppExplorerDependancies.cmake","");
        this.writeFile("CppExplorerProjects.cmake","");
        this.writeFile(".gitignore","/bin/*\n/build/*");
        this.writeWorkSpaceFile();
        this.initilizeGit();
        this.refresh();
    }

    private pathExists(p: string): boolean {
		try {
			fs.accessSync(p);
		} catch (err) {
			return false;
		}

		return true;
    }
    
    private writeWorkSpaceFile()
    {
        this.writeFile("CMakeLists.txt", "include(CppExplorerOptions.cmake)\n"
        + "cmake_minimum_required(VERSION ${MinimumCMakeVersion})\n"
        + "project("+vscode.workspace.name+" VERSION 0.1.0)\n\n"
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
        + "include(CppExplorerProjects.cmake)");
    }

    writeFile(pathName: string, fileContents: string)
    {
        fs.writeFile(this.workspaceRoot+"/"+pathName, fileContents, (err) =>{});
    }
}

export class TreeNode extends vscode.TreeItem
{
    public children: TreeNode[]|undefined;
    public filePath: string;

    constructor(label: string|undefined, type: string|undefined, filePath: string)
    {
        if(label === undefined)
        {
            label = '';
        }

        super(label, vscode.TreeItemCollapsibleState.None);

        this.children = [];
        this.filePath = filePath;

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
        else if(type === 'dependancylibrary')
        {
            this.iconPath = new vscode.ThemeIcon('repo');
            this.contextValue = 'dependancylibrary';
        }
        else if(type === 'properties')
        {
            this.tooltip = "Properties";
            this.iconPath = new vscode.ThemeIcon('symbol-property');
            this.contextValue = 'properties';
            this.command = { command: 'cppExplorer.openFile', title: "Open Properties", arguments: [this.filePath] };
        }
        else if(type === 'binaries')
        {
            this.tooltip = "Built Files";
            this.iconPath = new vscode.ThemeIcon('file-binary');
            this.contextValue = 'binaries';
        }
        else if(type === 'license')
        {
            this.tooltip = "License";
            this.iconPath = new vscode.ThemeIcon('law');
            this.contextValue = 'file';
        }
        else if(type === 'template')
        {
            this.tooltip = "Template: "+label;
            this.iconPath = new vscode.ThemeIcon('file-code');
            this.contextValue = 'template';
        }
        else if(type === 'folder')
        {
            this.iconPath = new vscode.ThemeIcon('folder-opened');
            this.contextValue = 'folder';
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
                        if(asDirectory === true && child.contextValue === "folder")
                        {
                            retValue = true;
                        }
                        else if (asDirectory !== true && child.contextValue !== "folder")
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