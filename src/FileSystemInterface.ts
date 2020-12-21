import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as readline from 'readline';
import { TreeNodeType } from './TreeNode';

class FileData
{
    static headerFile(projectName: string, className: string) : string
    {
        var fileContents = "#ifndef "+projectName.toUpperCase()+"_HPP\n"
        + "#define "+projectName.toUpperCase()+"_HPP\n\n"
        + "namespace "+projectName+"\n"
        + "{\n";
        if(className !== "")
        {
            fileContents += "    class "+className+"\n    {\n\n    };\n";
        }
        else
        {
            fileContents += "\n;";
        }
        fileContents += "}\n\n"
        + "#endif //"+projectName.toUpperCase()+"_HPP";
        return fileContents;
    }

    static templateFile(projectName: string, className: string) :string
    {
        return "#ifndef "+projectName.toUpperCase()+"_HPP\n"
        + "#define "+projectName.toUpperCase()+"_HPP\n\n"
        + "namespace "+projectName+"\n"
        + "{\n"
        + "    template <>\n"
        + "    class "+className+"\n    {\n\n    };\n"
        + "}\n\n"
        + "#endif //"+projectName.toUpperCase()+"_HPP";
    }

    static implementationFile(projectName: string, className: string) : string
    {
        var fileContents = "";
        if (className !== "")
        {
            fileContents += "#include \""+projectName+".hpp\"\n\n";
        }
        fileContents += "namespace "+projectName+"\n"
        + "{\n\n"
        + "}\n";
        return fileContents;
    }

    static internalHeader(projectName: string) : string
    {
        return "#ifndef INTERNALKEYWORD_HPP\n"
        + "    #define INTERNALKEYWORD_HPP\n\n"
        + "    #ifndef "+projectName.toUpperCase()+"INTERNAL\n"
        + "        #define _internal public\n"
        + "    #else\n"
        + "        #define _internal private\n"
        + "    #endif\n"
        + "#endif\n";
    }

    static combinedHeader(projectName: string, list: string[], lengthToClip: number, internalkey: boolean) : string
    {
        var capitalProjectName = projectName.toUpperCase();
        var fileContents = "#ifndef " + capitalProjectName + "_HPP\n"
        + "#define " + capitalProjectName + "_HPP\n\n";
        if(internalkey)
        {
            fileContents += "    #undef _internal\n";   
            fileContents += "    #define " + capitalProjectName + "INTERNAL\n\n";   
        }
        var includeLoop;
        for(includeLoop = 0; includeLoop < list.length; includeLoop++)
        {
            var shortenedName = list[includeLoop].substring(lengthToClip);
            fileContents += "    #include \"" + shortenedName + "\"\n";
        }
        fileContents += "\n";
        if(internalkey)
        {
            fileContents += "    #undef _internal\n";   
            fileContents += "    #undef " + capitalProjectName + "INTERNAL\n\n";   
        }
        fileContents += "#endif //" + capitalProjectName + "_HPP\n";
        return fileContents;
    }

    static projectConfig(projectType: TreeNodeType) : string
    {
        var fileContents = "include(CppExplorerOptions.cmake)\n"
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
        return fileContents;
    }

    static mainCpp() : string
    {
        return "int main(int argCount, char *argValues[])\n"
        + "{\n"
        + "\n"
        + "    return 0;\n"
        + "}";
    }

    static projectOptions(projectName: string, projectType: TreeNodeType) : string
    {
        var fileContents = "set(ProjectName "+projectName+")\n"
        + "set(ProjectVersion 1.0.0)\n"
        + "OPTION(EnableTesting \"Turn on Testing\" ON)\n";
        + "OPTION(EnableInternalKeyword \"Creates an _internal keyword for more access control\" ON)\n";
        if(projectType === TreeNodeType.executable)
        {
            fileContents += "OPTION(AutoGenCombinedLibraryHeader \"For library projects, create a combined header\" OFF)\n";
        }
        else
        {
            fileContents += "OPTION(AutoGenCombinedLibraryHeader \"For library projects, create a combined header\" ON)\n";
        }
        fileContents += "\n"
        + "## Symbol && can be used to run multiple commands ##\n"
        + "set(WindowsPreBuildCommand \"\")\n"
        + "set(WindowsPostBuildCommand \"\")\n"
        + "set(UnixPreBuildCommand \"\")\n"
        + "set(UnixPostBuildCommand \"\")\n";
        return fileContents;
    }

    static workspaceConfig() : string
    {
        return "include(CppExplorerOptions.cmake)\n"
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
        + "include(CppExplorerProjects.cmake)";
    }
}

export class FileSystemInterface
{
    constructor(private workspaceRoot: any)
    {
        this.workspaceRoot = workspaceRoot;
    }

    createHeaderFile(fullPath:string, projectName: string, className: string)
    {
        fs.writeFileSync(fullPath, FileData.headerFile(projectName, className));
    }

    createTemplateFile(fullPath:string, projectName: string, className: string)
    {
        fs.writeFileSync(fullPath, FileData.templateFile(fullPath, className));
    }

    createImplementationFile(fullPath:string, projectName: string, className :string)
    {
        fs.writeFileSync(fullPath, FileData.implementationFile(projectName, className));
    }

    generateInternalHeader(projectName :string)
    {
        var internalPath = this.workspaceRoot+"/"+projectName+"/include/InternalKeyword.hpp";
        if(!this.pathExists(internalPath))
        {
            fs.writeFileSync(internalPath, FileData.internalHeader(projectName));
        }
    }
    
    generateCombinedHeader(projectName :string)
    {
        var internalkey = this.getOption("EnableInternalKeyword", projectName);
        var list :string[]= [];
        list = this.makeListFiles(this.workspaceRoot+"/"+projectName, list, ".hpp");
        var pathRootLength = this.workspaceRoot.length+projectName.length+2;
        var fileContents = FileData.combinedHeader(projectName, list, pathRootLength, internalkey);
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
        var directories = fs.readdirSync(fullPath);
        var loop;
        for(loop = 0; loop < directories.length; loop++)
        {
            var file = directories[loop];
            let fileName = path.basename(file);
            var isDirectory = fs.lstatSync(fullPath+"/"+fileName).isDirectory();
            if(isDirectory)
            {
                list.push(fileName);
            }
        }
        return list;
    }

    getFiles(fullPath: string) : string[]
    {
        var list:string[] = [];
        var directories = fs.readdirSync(fullPath);
        var loop;
        for(loop = 0; loop < directories.length; loop++)
        {
            var file = directories[loop];
            let fileName = path.basename(file);
            var isDirectory = fs.lstatSync(fullPath+"/"+fileName).isDirectory();
            if(!isDirectory)
            {
                list.push(fileName);
            }
        }
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
        this.writeFile("CppExplorerOptions.cmake","set(MinimumCMakeVersion 3.0.0)\n");
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

    getProjectType(projectName: string) : TreeNodeType
    {
        var result = fs.readFileSync(this.workspaceRoot+"/"+projectName+"/CMakeLists.txt").toString();
        var lines = result.split("\n");
        var loop;
        for(loop = 0; loop < lines.length; loop++)
        {
            if(lines[loop].indexOf("add_library(") !== -1)
            {
                return TreeNodeType.library;
            }
        }
        
        return TreeNodeType.executable;
    }

    getOption(optionName:string, projectName: string) : boolean
    {
        var fullPath = this.workspaceRoot+"/"+projectName+"/CppExplorerOptions.cmake";
        if(this.pathExists(fullPath))
        {
            var result = fs.readFileSync(fullPath).toString();
            var lines = result.split("\n");
            var loop;
            for(loop = 0; loop < lines.length; loop++)
            {
                var line = lines[loop];
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

    private getFileAsLines(filePath: string) : string[]
    {
        var result = fs.readFileSync(filePath).toString();
        return result.split("\n");
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

    createProject(projectName: string, projectType: TreeNodeType)
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

        this.writeFile(projectName+"/CMakeLists.txt", FileData.projectConfig(projectType));
  
        if(projectType === TreeNodeType.executable)
        {
            fs.writeFile(projectRoot+"/main.cpp", FileData.mainCpp(), (err) =>{});
        }
        
        this.writeFile(projectName+"/CppExplorerOptions.cmake", FileData.projectOptions(projectName, projectType));
    }

    deleteFile(filePath: string)
    {
        fs.unlinkSync(filePath);
    }

    private pathExists(path: string): boolean
    {
        try
        {
			fs.accessSync(path);
        }
        catch (err)
        {
			return false;
		}

		return true;
    }

    getProjects() : string[]
    {
        var list:string[] = [];
        var directories = fs.readdirSync(this.workspaceRoot);
        var loop;
        for(loop = 0; loop < directories.length; loop++)
        {
            var file = directories[loop];
            let fileName = path.basename(file);
            var isDirectory = fs.lstatSync(this.workspaceRoot+"/"+fileName).isDirectory();
            if(isDirectory)
            {
                if(fileName.substring(0,1) !== "." && fileName !== 'libraries' && fileName !== 'build' && fileName !== 'bin')
                {
                    list.push(fileName);
                }
            }
        }
        return list;
    }
    
    private writeWorkSpaceFile()
    {
        this.writeFile("CMakeLists.txt", FileData.workspaceConfig());
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