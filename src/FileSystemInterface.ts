import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { TreeNodeType } from './TreeNode';
import { isIPv4 } from 'net';

class FileData
{
    static headerFile(projectName: string, fileName: string, isClass : boolean) : string
    {
        var token = projectName.toUpperCase()+"_"+fileName.toUpperCase()+"_HPP";
        var fileContents = "#ifndef "+token+"\n"
        + "#define "+token+"\n\n"
        + "namespace "+projectName.toLowerCase()+"\n"
        + "{\n";
        if(fileName !== "" && isClass)
        {
            fileContents += "    class "+fileName+"\n    {\n\n    };\n";
        }
        else
        {
            fileContents += "\n;";
        }
        fileContents += "}\n\n"
        + "#endif //"+token;
        return fileContents;
    }

    static templateFile(projectName: string, fileName: string) :string
    {
        var token = projectName.toUpperCase()+"_"+fileName.toUpperCase()+"_HPP";
        return "#ifndef "+token+"\n"
        + "#define "+token+"\n\n"
        + "namespace "+projectName.toLowerCase()+"\n"
        + "{\n"
        + "    template <typename T>\n"
        + "    class "+fileName+"\n    {\n\n    };\n"
        + "}\n\n"
        + "#endif //"+token;
    }

    static implementationFile(projectName: string, className: string) : string
    {
        var fileContents = "";
        if (className !== "")
        {
            fileContents += "#include \""+className+".hpp\"\n\n";
        }
        fileContents += "namespace "+projectName.toLowerCase()+"\n"
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
            if(shortenedName !== projectName+".hpp")
            {
                fileContents += "    #include \"" + shortenedName + "\"\n";
            }
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
        var fileContents = "INCLUDE(CppExplorerOptions.cmake)\n"
        + "CMAKE_MINIMUM_REQUIRED(VERSION ${CppEx_MinimumCMakeVersion})\n"
        + "PROJECT(${CppEx_ProjectName} VERSION ${CppEx_ProjectVersion})\n\n"
        + "INCLUDE_DIRECTORIES(\"include\")\n"
        + "INCLUDE_DIRECTORIES(\"..\")\n\n"
        + "INCLUDE_DIRECTORIES(\"../libraries\")\n\n"
        + "#Add all the source files to build library\n"
        + "INCLUDE(\"${CMAKE_CURRENT_SOURCE_DIR}/SourceFiles.cmake\")\n\n";
        
        if(projectType === TreeNodeType.executable)
        {
            fileContents += "ADD_EXECUTABLE(${PROJECT_NAME} ${CppEx_SourceFiles})\n\n";
        }
        else
        {
            fileContents += "ADD_LIBRARY(${PROJECT_NAME} SHARED ${CppEx_SourceFiles})\n"
            + "ADD_LIBRARY(${PROJECT_NAME}_STATIC STATIC ${CppEx_SourceFiles})\n\n";
        }
    
        fileContents += "IF(${CMAKE_SYSTEM_NAME} STREQUAL \"Windows\")\n"
        + "    IF(NOT ${CppEx_WindowsPreBuildCommand} STREQUAL \"\")\n"
        + "        ADD_CUSTOM_COMMAND(TARGET ${PROJECT_NAME}\n"
        + "            PRE_BUILD COMMAND\n"
        + "            ${CppEx_WindowsPreBuildCommand}\n"
        + "        )\n"
        + "    ENDIF()\n"
        + "    IF(NOT ${CppEx_WindowsPostBuildCommand} STREQUAL \"\")\n"
        + "        ADD_CUSTOM_COMMAND(TARGET ${PROJECT_NAME}\n"
        + "            POST_BUILD COMMAND\n"
        + "            ${CppEx_WindowsPostBuildCommand}\n"
        + "        )\n"
        + "    ENDIF()\n"
        + "ELSE()\n"
        + "    IF(NOT ${CppEx_UnixPreBuildCommand} STREQUAL \"\")\n"
        + "        ADD_CUSTOM_COMMAND(TARGET ${PROJECT_NAME}\n"
        + "            PRE_BUILD COMMAND\n"
        + "            ${CppEx_UnixPreBuildCommand}\n"
        + "        )\n"
        + "    ENDIF()\n"
        + "    IF(NOT ${CppEx_UnixPostBuildCommand} STREQUAL \"\")\n"
        + "        ADD_CUSTOM_COMMAND(TARGET ${PROJECT_NAME}\n"
        + "            POST_BUILD COMMAND\n"
        + "            ${CppEx_UnixPostBuildCommand}\n"
        + "        )\n"
        + "    ENDIF()\n"
        + "endif()\n\n"
        + "IF (CMAKE_CXX_COMPILER_ID STREQUAL \"Clang\")\n"
        + "    IF (CppEx_WarningAsError)\n"
        + "        SET(CMAKE_CXX_FLAGS  \"${CMAKE_CXX_FLAGS} -Werror\")\n"
        + "    ENDIF()\n"
        + "    IF (CppEx_AllWarnings)\n"
        + "        SET(CMAKE_CXX_FLAGS  \"${CMAKE_CXX_FLAGS} -Wall\")\n"
        + "    ENDIF()\n"
        + "ELSEIF (CMAKE_CXX_COMPILER_ID STREQUAL \"GNU\")\n"
        + "    IF (CppEx_WarningAsError)\n"
        + "        SET(CMAKE_CXX_FLAGS  \"${CMAKE_CXX_FLAGS} -Werror\")\n"
        + "    ENDIF()\n"
        + "    IF (CppEx_AllWarnings)\n"
        + "        SET(CMAKE_CXX_FLAGS  \"${CMAKE_CXX_FLAGS} -Wall\")\n"
        + "    ENDIF()\n"
        + "ELSEIF (CMAKE_CXX_COMPILER_ID STREQUAL \"MSVC\")\n"
        + "    IF (CppEx_WarningAsError)\n"
        + "        SET(CMAKE_CXX_FLAGS  \"${CMAKE_CXX_FLAGS} /WX\")\n"
        + "    ENDIF()\n"
        + "    IF (CppEx_AllWarnings)\n"
        + "        SET(CMAKE_CXX_FLAGS  \"${CMAKE_CXX_FLAGS} /Wall\")\n"
        + "    ENDIF()\n"
        + "ENDIF()";
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
        var fileContents = "SET(CppEx_ProjectName "+projectName+")\n"
        + "SET(CppEx_ProjectVersion 1.0.0)\n"
        + "OPTION(CppEx_EnableTesting \"Turn on Testing\" ON)\n"
        + "OPTION(CppEx_TestingSectionVisible \"Testing section visibility\" ON)\n"
        + "OPTION(CppEx_EnableInternalKeyword \"Creates an _internal keyword for more access control\" ON)\n";
        if(projectType === TreeNodeType.executable)
        {
            fileContents += "OPTION(CppEx_AutoGenCombinedLibraryHeader \"For library projects, create a combined header\" OFF)\n";
        }
        else
        {
            fileContents += "OPTION(CppEx_AutoGenCombinedLibraryHeader \"For library projects, create a combined header\" ON)\n";
        }
        fileContents += "\n\n"
        + "## Symbol && can be used to run multiple commands ##\n"
        + "SET(CppEx_WindowsPreBuildCommand \"\")\n"
        + "SET(CppEx_WindowsPostBuildCommand \"\")\n"
        + "SET(CppEx_UnixPreBuildCommand \"\")\n"
        + "SET(CppEx_UnixPostBuildCommand \"\")\n\n"
        + "OPTION(CppEx_WarningAsError \"Treat Warnings as Errors\" OFF)\n"
        + "OPTION(CppEx_AllWarnings \"Show All Warnings\" OFF)\n";
        return fileContents;
    }

    static workspaceConfig() : string
    {
        return "INCLUDE(CppExplorerOptions.cmake)\n"
        + "CMAKE_MINIMUM_REQUIRED(VERSION ${CppEx_MinimumCMakeVersion})\n"
        + "PROJECT("+vscode.workspace.name+" VERSION 0.1.0)\n\n"
        + "INCLUDE(CppExplorerDependancies.cmake)\n\n"
        + "INCLUDE(CTest)\n"
        + "ENABLE_TESTING()\n\n"
        + "#Determine if 32 or 64 bit\n"
        + "SET(OSBitness 32)\n"
        + "IF(CMAKE_SIZEOF_VOID_P EQUAL 8)\n"
        + "    SET(OSBitness 64)\n"
        + "ENDIF()\n\n"
        + "#Save outputs into bin folder\n"
        + "SET(CppEx_FullOutputDir \"${CMAKE_SOURCE_DIR}/bin/${CMAKE_SYSTEM_NAME}${OSBitness}/${CMAKE_BUILD_TYPE}\")\n"
        + "SET(CMAKE_ARCHIVE_OUTPUT_DIRECTORY \"${CppEx_FullOutputDir}/static libs\")\n"
        + "SET(CMAKE_LIBRARY_OUTPUT_DIRECTORY ${CppEx_FullOutputDir})\n"
        + "SET(CMAKE_RUNTIME_OUTPUT_DIRECTORY ${CppEx_FullOutputDir})\n"
        + "SET(CMAKE_RUNTIME_OUTPUT_DIRECTORY ${CppEx_FullOutputDir})\n\n"
        + "INCLUDE(CppExplorerProjects.cmake)";
    }

    static batchTestCpp() :string
    {
        {
            return "#include <string.h>\n\n"
            + "int main(int argCount, char *argValues[])\n"
            + "{\n"
            + "    if(strcmp(argValues[1], \"1\")\n"
            + "    {\n"
            + "        //Successful Test Case Example\n"
            + "        exit(0);\n"
            + "    }\n"
            + "    else\n"
            + "    {\n"
            + "        //Failed Test Case Example\n"
            + "        exit(1);\n"
            + "    }\n"
            + "    //Return a failure since it shouldn't get here.\n"
            + "    return 1;\n"
            + "}";
        }
    }
}

export class FileSystemInterface
{
    constructor(private workspaceRoot: any)
    {
        this.workspaceRoot = workspaceRoot;
    }

    createLicense(projectName: string)
    {
        this.writeFile(projectName+"/LICENSE","");
    }

    addFile(filePath: string)
    {
        this.writeFile(filePath,"");
    }
    
    createHeaderFile(relativeWorkspacePath:string, projectName: string, fileName: string, isClass:boolean)
    {
        this.writeFile(relativeWorkspacePath, FileData.headerFile(projectName, fileName, isClass));
    }

    createTemplateFile(relativeWorkspacePath:string, projectName: string, className: string)
    {
        this.writeFile(relativeWorkspacePath, FileData.templateFile(projectName, className));
    }

    createImplementationFile(relativeWorkspacePath:string, projectName: string, className :string)
    {
        this.writeFile(relativeWorkspacePath, FileData.implementationFile(projectName, className));
    }

    removeLibrary(libraryName: string)
    {
        var libraries = this.getLibraries();
        var loop;
        var fileContents = "";
        for(loop = 0; loop < libraries.length; loop++)
        {
            if(libraries[loop] !== libraryName)
            {
                fileContents += "FIND_PACKAGE("+libraries[loop]+" REQUIRED)\n";
            }
        }
        this.writeFile("CppExplorerDependancies.cmake", fileContents);
    }

    generateInternalHeader(projectName :string)
    {
        var internalPath = projectName+"/include/InternalKeyword.hpp";
        if(!this.pathExists(internalPath))
        {
            this.writeFile(internalPath, FileData.internalHeader(projectName));
        }
    }

    createMinimumProjectFolders(projectName: string)
    {
        this.createPath(projectName+"/include");
        this.createPath(projectName+"/src");
    }

    addProjectFolder(currentRelativeWorkspacePath: string, newFolderName: string)
    {
        this.createPath(currentRelativeWorkspacePath+"/"+newFolderName);
    }

    addBatchTest(projectName:string, batchTestName: string)
    {
        this.createPath(projectName+"/tests");
        this.writeFile(projectName+"/tests/"+batchTestName+".cpp", FileData.batchTestCpp());
    }
    
    generateCombinedHeader(projectName :string)
    {
        var internalkey = this.getOption("CppEx_EnableInternalKeyword", projectName);
        var list :string[]= [];
        list = this.makeListFiles(this.workspaceRoot+"/"+projectName, list, ".hpp");
        var pathRootLength = this.workspaceRoot.length+projectName.length+2;
        var fileContents = FileData.combinedHeader(projectName, list, pathRootLength, internalkey);
        this.writeFile(projectName+"/"+projectName+".hpp",fileContents);
    }

    rootIsValid() : boolean
    {
        return this.pathExists("CMakeLists.txt");
    }

    projectIsValid(projectName :string) : boolean
    {
        return this.pathExists(projectName+"/CMakeLists.txt");
    }

    directoryExists(relativeWorkspacePath: string) : boolean
    {
        if(this.pathExists(relativeWorkspacePath) && fs.lstatSync(this.workspaceRoot+"/"+relativeWorkspacePath).isDirectory())
        {
            return true;
        }
        return false;
    }

    getDirectories(relativeWorkspacePath: string) : string[]
    {
        var list:string[] = [];
        var fullPath = this.workspaceRoot+"/"+relativeWorkspacePath;
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

    getFiles(relativeWorkspacePath: string) : string[]
    {
        var list:string[] = [];
        var fullPath = this.workspaceRoot+"/"+relativeWorkspacePath;
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
            if(this.pathExists(projects[loop]))
            {
                var list :string[] = [];
                list = this.makeListFiles(this.workspaceRoot+"/"+projects[loop],list,".cpp");
                var fileIndex;
                var fileContents = "SET(CppEx_SourceFiles \n";
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

    projectLoaded(projectName: string) : boolean
    {
        var currentLines = this.getFileAsLines("CppExplorerProjects.cmake");
        var loop;
        var lines :string[] = [];
        for(loop = 0; loop < currentLines.length; loop++)
        {
            var line = currentLines[loop];
            var search = "#ADD_SUBDIRECTORY(\""+projectName+"\")";
            if(line.indexOf(search) !== -1)
            {
                return false;
            }
        }
        return true;
    }

    unloadProject(projectName: string)
    {
        var currentLines = this.getFileAsLines("CppExplorerProjects.cmake");
        var loop;
        var lines :string[] = [];
        for(loop = 0; loop < currentLines.length; loop++)
        {
            var line = currentLines[loop];
            var search = "ADD_SUBDIRECTORY(\""+projectName+"\")";
            if(line.indexOf(search) !== -1)
            {
                lines.push("#ADD_SUBDIRECTORY(\""+projectName+"\")");
            }
            else
            {
                lines.push(currentLines[loop]);
            }
        }
        this.writeFile("CppExplorerProjects.cmake", lines.join("\n"));
    }

    reloadProject(projectName: string)
    {
        var currentLines = this.getFileAsLines("CppExplorerProjects.cmake");
        var loop;
        var lines :string[] = [];
        for(loop = 0; loop < currentLines.length; loop++)
        {
            var line = currentLines[loop];
            var search = "#ADD_SUBDIRECTORY(\""+projectName+"\")";
            if(line.indexOf(search) !== -1)
            {
                lines.push("ADD_SUBDIRECTORY(\""+projectName+"\")");
            }
            else
            {
                lines.push(currentLines[loop]);
            }
        }
        this.writeFile("CppExplorerProjects.cmake", lines.join("\n"));
    }

    updateExplorerProjectsFile()
    {
        var projects = this.getProjects();
        var excludedProject :string[] = [];
        var currentLines = this.getFileAsLines("CppExplorerProjects.cmake");
        var loop;
        for(loop = 0; loop < currentLines.length; loop++)
        {
            var line = currentLines[loop];
            var search = "#ADD_SUBDIRECTORY(";
            if(line.indexOf(search) !== -1)
            {
                excludedProject.push(line.substring(search.length+1, line.length-2));
            }
        }
        var fileContents = "";
        for(loop = 0; loop < projects.length; loop++)
        {
            if(excludedProject.indexOf(projects[loop]) === -1)
            {
                fileContents += "ADD_SUBDIRECTORY(\""+projects[loop]+"\")\n";
            }
            else
            {
                fileContents += "#ADD_SUBDIRECTORY(\""+projects[loop]+"\")\n";
            }
        }
        this.writeFile("CppExplorerProjects.cmake", fileContents);
    }

    createWorkspace()
    {
        this.createPath("libraries");
        this.writeFile("CppExplorerOptions.cmake","SET(CppEx_MinimumCMakeVersion 3.0.0)\n");
        this.writeFile("CppExplorerDependancies.cmake","");
        this.writeFile("CppExplorerProjects.cmake","");
        this.writeFile(".gitignore","/bin/*\n/build/*");
        this.writeWorkSpaceFile();
    }

    createPath(relativeWorkspacePath: string)
    {
        if(!this.pathExists(relativeWorkspacePath))
        {
            fs.mkdirSync(this.workspaceRoot+"/"+relativeWorkspacePath);
        }
    }

    getProjectType(projectName: string) : TreeNodeType
    {
        var result = fs.readFileSync(this.workspaceRoot+"/"+projectName+"/CMakeLists.txt").toString();
        var lines = result.split("\n");
        var loop;
        for(loop = 0; loop < lines.length; loop++)
        {
            if(lines[loop].toUpperCase().indexOf("ADD_LIBRARY(") !== -1)
            {
                return TreeNodeType.library;
            }
        }
        
        return TreeNodeType.executable;
    }

    getOption(optionName:string, projectName: string) : boolean
    {
        var fullPath = this.workspaceRoot+"/"+projectName+"/CppExplorerOptions.cmake";
        if(this.pathExists(projectName+"/CppExplorerOptions.cmake"))
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

    private getFileAsLines(relativeWorkspacePath: string) : string[]
    {
        try
        {
            var result = fs.readFileSync(this.workspaceRoot+"/"+relativeWorkspacePath).toString();
            result = result.replace("\r",""); //get rid of windows line endings
            return result.split("\n");
        }
        catch
        {
            return [];
        }
    }

    deleteFolderRecursive(fullPathToDelete: string)
    {
        if (fs.existsSync(fullPathToDelete))
        {
            fs.readdirSync(fullPathToDelete).forEach((file, index) => {
            const curPath = path.join(fullPathToDelete, file);
            if (fs.lstatSync(curPath).isDirectory())
            { // recurse
                this.deleteFolderRecursive(curPath);
            } else { // delete file
                fs.unlinkSync(curPath);
            }});
            fs.rmdirSync(fullPathToDelete);
        }
    };

    createProject(projectName: string, projectType: TreeNodeType)
    {
        if(this.getProjects().indexOf(projectName) !== -1)
        {
            vscode.window.showErrorMessage("Project "+projectName+" already exists.");
            return;
        }

        this.createPath(projectName);
        this.createPath(projectName+"/include");
        this.createPath(projectName+"/src");
        this.createPath(projectName+"/tests");
    
        this.writeFile(projectName+"/SourceFiles.cmake","");
        this.writeFile(projectName+"/CppExplorerOptions.cmake", FileData.projectOptions(projectName, projectType));
        this.writeFile(projectName+"/CMakeLists.txt", FileData.projectConfig(projectType));
        this.writeFile(projectName+"/tests/CppExplorerTests.txt", "");
  
        if(projectType === TreeNodeType.executable)
        {
            this.writeFile(projectName+"/main.cpp", FileData.mainCpp());
        }
    }

    addLibrary(packageName: string)
    {
        fs.appendFileSync(this.workspaceRoot+"/CppExplorerDependancies.cmake", 
        "FIND_PACKAGE("+packageName+" REQUIRED)\n");
    }

    getLibraries() : string[]
    {
        var lines = this.getFileAsLines("CppExplorerDependancies.cmake");
        var loop;
        var list :string[] = [];
        for(loop = 0; loop < lines.length; loop++)
        {
            var search = "FIND_PACKAGE(";
            if(lines[loop].indexOf(search) !== -1)
            {
                var space = lines[loop].indexOf(" ");
                if(space === -1)
                {
                    space = lines[loop].indexOf(")");
                }
                list.push(lines[loop].substring(search.length, space));
            }
        }
        list = list.sort();
        return list;
    }

    deleteFile(relativeWorkspacePath: string)
    {
        fs.unlinkSync(this.workspaceRoot+"/"+relativeWorkspacePath);
    }

    private pathExists(relativeWorkspacePath: string): boolean
    {
        try
        {
			fs.accessSync(this.workspaceRoot+"/"+relativeWorkspacePath);
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

    private makeListFiles(initialFullPath: string, list: string[], ext: string) : string[]
    {
        var newList = list;
        if (fs.existsSync(initialFullPath))
        {
            fs.readdirSync(initialFullPath).forEach((file, index) => {
                const curPath = path.join(initialFullPath, file);
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

    private writeFile(relativeWorkspacePath: string, fileContents: string)
    {
        if(relativeWorkspacePath.indexOf(this.workspaceRoot) === -1)
        {
            fs.writeFileSync(this.workspaceRoot+"/"+relativeWorkspacePath, fileContents);
        }
        else
        {
            fs.writeFileSync(relativeWorkspacePath, fileContents);
        }
    }

    private readListFromCMake(relativeWorkspacePath: string, variable: string) : string[]
    {
        var lines = this.getFileAsLines(relativeWorkspacePath);
        var loop;
        var foundVariable = false;
        var result : string[] = [];
        for(loop = 0; loop < lines.length; loop++)
        {
            let line = lines[loop];
            let searchString = "SET("+variable;
            if(foundVariable)
            {
                let shortened = line.substring(searchString.length);
                if(line.indexOf(")") === -1)
                {
                    var subList = shortened.split(" ");
                    result.concat(subList);
                }
                else
                {
                    var subList = shortened.split(" ");
                    result.concat(subList);
                    break;
                }
            }
            if(line.indexOf(searchString) !== -1)
            {
                foundVariable = true;
                let shortened = line.substring(searchString.length);
                if(line.indexOf(")") === -1)
                {
                    var subList = shortened.split(" ");
                    result.concat(subList);
                }
                else
                {
                    var subList = shortened.split(" ");
                    result.concat(subList);
                    break;
                }
            }
        }
        return result;
    }

    private writeListForCMake(variable: string, list: string[]) : string
    {
        var fileContents = "SET("+variable+" ";
        var loop;
        for(loop = 0; loop < list.length; loop++)
        {
            fileContents += list[loop];
            if(loop === list.length-1)
            {
                fileContents += ")\n";
            }
            else
            {
                fileContents += "\n";
            }
        }
        return fileContents;
    }
}