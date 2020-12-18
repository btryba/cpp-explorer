import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as readline from 'readline';
import { TreeNodeType } from './TreeNode';

export class FileSystemInterface
{
    constructor(private workspaceRoot: any)
    {
        this.workspaceRoot = workspaceRoot;
    }

    generateInternalHeader(projectName :string)
    {
        var internalPath = this.workspaceRoot+"/"+projectName+"/include/InternalKeyword.hpp";
        if(!this.pathExists(internalPath))
        {
            fs.writeFileSync(internalPath,
            "#ifndef INTERNALKEYWORD_HPP\n"
            + "    #define INTERNALKEYWORD_HPP\n\n"
            + "    #ifndef "+projectName.toUpperCase()+"INTERNAL\n"
            + "        #define _internal public\n"
            + "    #else\n"
            + "        #define _internal private\n"
            + "    #endif\n"
            + "#endif\n");
        }
    }
    
    generateCombinedHeader(projectName :string)
    {
        var internalkey = this.getOption("EnableInternalKeyword", projectName);
        var list :string[]= [];
        list = this.makeListFiles(this.workspaceRoot+"/"+projectName, list, ".hpp");
        var fileContents = "#ifndef "+projectName.toUpperCase()+"_HPP\n"
        + "#define "+projectName.toUpperCase()+"_HPP\n\n";
        if(internalkey)
        {
            fileContents += "    #undef _internal\n";   
            fileContents += "    #define "+projectName.toUpperCase()+"INTERNAL\n\n";   
        }
        var includeLoop;
        for(includeLoop = 0; includeLoop < list.length; includeLoop++)
        {
            var shortenedName = list[includeLoop].substring(this.workspaceRoot.length+projectName.length+2);
            fileContents += "    #include \""+shortenedName+"\"\n";
        }
        fileContents += "\n";
        if(internalkey)
        {
            fileContents += "    #undef _internal\n";   
            fileContents += "    #undef "+projectName.toUpperCase()+"INTERNAL\n\n";   
        }
        fileContents += "#endif //"+projectName.toUpperCase()+"_HPP\n";
        this.writeFile(projectName+"/"+projectName+".hpp",fileContents);
    }

    rootIsValid() : boolean
    {
        return this.pathExists(this.workspaceRoot+"/CMakeLists.txt");
    }

    projectIsValid(projectName :string) : boolean
    {
        return this.pathExists(this.workspaceRoot+"/"+projectName+"/CMakeLists.txt");
    }

    directoryExists(fullPath: string) : boolean
    {
        if(this.pathExists(fullPath) && fs.lstatSync(fullPath).isDirectory())
        {
            return true;
        }
        return false;
    }

    getDirectories(fullPath: string) : string[]
    {
        var list:string[] = [];
        fs.readdirSync(fullPath).forEach(async file => {
            let fileName = path.basename(file);
            var isDirectory = fs.lstatSync(fullPath+"/"+fileName).isDirectory();
            if(isDirectory)
            {
                list.push(fileName);
            }
        });
        return list;
    }

    getFiles(fullPath: string) : string[]
    {
        var list:string[] = [];
        fs.readdirSync(fullPath).forEach(async file => {
            let fileName = path.basename(file);
            var isDirectory = fs.lstatSync(fullPath+"/"+fileName).isDirectory();
            if(!isDirectory)
            {
                list.push(fileName);
            }
        });
        return list;
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

    createWorkspace()
    {
        this.createPath("libraries");
        this.writeFile("CppExplorerOptions.cmake","set(MinimumCMakeVersion 3.0.0)\n"
        + "OPTION(EnableTesting \"Turn on Testing\" ON)\n");
        this.writeFile("CppExplorerDependancies.cmake","");
        this.writeFile("CppExplorerProjects.cmake","");
        this.writeFile(".gitignore","/bin/*\n/build/*");
        this.writeWorkSpaceFile();
    }

    createPath(pathName: string)
    {
        if(!this.pathExists(this.workspaceRoot+"/"+pathName))
        {
            fs.mkdir(this.workspaceRoot+"/"+pathName, (err) => {});
        }
    }

    async getProjectType(projectName: string) : Promise<TreeNodeType>
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
                return TreeNodeType.library;
            }
        }
        return TreeNodeType.executable;
    }

    async getOption(optionName:string, projectName: string) : Promise<boolean>
    {
        var fullPath = this.workspaceRoot+"/"+projectName+"/CppExplorerOptions.cmake";
        if(this.pathExists(fullPath))
        {
            var list = await this.getFileAsLines(fullPath);
            var loop;
            for(loop = 0; loop < list.length; loop++)
            {
                var line = list[loop];
                if(line.indexOf("OPTION("+optionName) !== -1)
                {
                    if(line.indexOf(" ON)") !== -1)
                    {
                        return true;
                    }
                    else
                    {
                        return false;
                    }
                }
            }
        }
        return false;
    }

    deleteBinaries()
    {
        this.deleteFolderRecursive(this.workspaceRoot+"/bin");
    }

    removeCmakeData()
    {
        this.deleteFolderRecursive(this.workspaceRoot+"/bin");
        this.deleteFolderRecursive(this.workspaceRoot+"/build");
    }

    private async getFileAsLines(filePath: string) : Promise<string[]>
    {
        const fileStream = fs.createReadStream(filePath);

        const rl = readline.createInterface({
            input: fileStream,
            crlfDelay: Infinity
        });
        var list:string[] = [];
        for await (const line of rl)
        {
            list.push(line);
        }
        return list;
    }

    deleteFolderRecursive(toDelete: string)
    {
        if (fs.existsSync(toDelete))
        {
            fs.readdirSync(toDelete).forEach((file, index) => {
            const curPath = path.join(toDelete, file);
            if (fs.lstatSync(curPath).isDirectory())
            { // recurse
                this.deleteFolderRecursive(curPath);
            } else { // delete file
                fs.unlinkSync(curPath);
            }});
            fs.rmdirSync(toDelete);
        }
    };

    async createProject(projectName: string, projectType: TreeNodeType)
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
        
        if(projectType === TreeNodeType.executable)
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
  
        if(projectType === TreeNodeType.executable)
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

    async deleteFile(filePath: string)
    {
        fs.unlinkSync(filePath);
    }

    private pathExists(p: string): boolean {
		try {
			fs.accessSync(p);
		} catch (err) {
			return false;
		}

		return true;
    }

    getProjects() : string[]
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

    private writeFile(pathName: string, fileContents: string)
    {
        fs.writeFile(this.workspaceRoot+"/"+pathName, fileContents, (err) =>{});
    }
}