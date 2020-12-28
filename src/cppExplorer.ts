import * as vscode from 'vscode';
import {TreeNode, TreeNodeType} from './TreeNode';
import {UserInterface, FileType} from './UserInterface';
import {SystemCaller} from './SystemCaller';
import {TreeProvider} from './TreeProvider';
import { FileSystemInterface } from './FileSystemInterface';

export class ExplorerTree extends TreeProvider
{
    constructor(workspaceRoot: any)
    {
        super(workspaceRoot);
        this.readWorkspace();
    }

    //Commands
    enableTests(treeNode : TreeNode)
    {
        FileSystemInterface.setOption("CppEx_EnableTesting", "Turn on Testing", true, treeNode.name);
    }

    disableTests(treeNode : TreeNode)
    {
        FileSystemInterface.setOption("CppEx_EnableTesting", "Turn on Testing", false, treeNode.name);
    }

    async deleteFile(relativeWorkspacePath: string)
    {
        if(relativeWorkspacePath !== undefined)
        {
            if(await UserInterface.removeFile())
            {
                FileSystemInterface.deleteFile(relativeWorkspacePath);
                this.refresh();
            }
        }
    }

    async addProjectFolder(node: TreeNode)
    {
        var folderName = await UserInterface.prompt("Folder Name");
        if(folderName !== "")
        {
            if(node.treeNodeType === TreeNodeType.library || node.treeNodeType === TreeNodeType.executable)
            {
                FileSystemInterface.addProjectFolder(node.relativeWorkspacePath+"/include", folderName);
                FileSystemInterface.addProjectFolder(node.relativeWorkspacePath+"/src", folderName);
            }
            else //Folder
            {
                let relativeWorkspacePath = node.relativeWorkspacePath;
                let firstSectionBegin = relativeWorkspacePath.indexOf("{");
                let firstSectionEnd = relativeWorkspacePath.indexOf("}");
                let folderFixed = relativeWorkspacePath.substring(0, firstSectionBegin) + "include" + relativeWorkspacePath.substring(firstSectionEnd+1);
                FileSystemInterface.addProjectFolder(folderFixed, folderName);
                folderFixed = relativeWorkspacePath.substring(0, firstSectionBegin) + "src" + relativeWorkspacePath.substring(firstSectionEnd+1);
                FileSystemInterface.addProjectFolder(folderFixed, folderName);
            }
            this.refresh();
        }
    }

    async addNonCodeFolder(node: TreeNode)
    {
        var folderName = await UserInterface.prompt("Folder Name");
        if(folderName !== "")
        {
            FileSystemInterface.addProjectFolder(node.relativeWorkspacePath, folderName);
            this.refresh();
        }
    }

    async addLibrary()
    {
        let list = ["Package Config Library"];
        var libraryType = await UserInterface.getFromList(list);
        if(libraryType === "Package Config Library")
        {
            let packageList = [
                'Custom Named',
                'ALSA',
                'Armadillo',
                'ASPELL',
                'AVIFile',
                'Backtrace',
                'BISON',
                'BLAS',
                'Boost',
                'Bullet',
                'BZip2',
                'CABLE',
                'Coin3D',
                'CUDAToolkit',
                'Cups',
                'CURL',
                'Curses',
                'CVS',
                'CxxTest',
                'Cygwin',
                'Dart',
                'DCMTK',
                'DevIL',
                'Doxygen',
                'EnvModules',
                'EXPAT',
                'FLEX',
                'FLTK',
                'FLTK2',
                'Fontconfig',
                'Freetype',
                'GCCXML',
                'GDAL',
                'Gettext',
                'GIF',
                'Git',
                'GLEW',
                'GLUT',
                'Gnuplot',
                'GnuTLS',
                'GSL',
                'GTest',
                'GTK',
                'GTK2',
                'HDF5',
                'Hg',
                'HSPELL',
                'HTMLHelp',
                'Ice',
                'Iconv',
                'Icotool',
                'ICU',
                'ImageMagick',
                'Intl',
                'ITK',
                'Jasper',
                'Java',
                'JNI',
                'JPEG',
                'KDE3',
                'KDE4',
                'LAPACK',
                'LATEX',
                'LibArchive',
                'Libinput',
                'LibLZMA',
                'LibXml2',
                'LibXslt',
                'LTTngUST',
                'Lua',
                'Lua50',
                'Lua51',
                'Matlab',
                'MFC',
                'Motif',
                'MPEG',
                'MPEG2',
                'MPI',
                'ODBC',
                'OpenACC',
                'OpenAL',
                'OpenCL',
                'OpenGL',
                'OpenMP',
                'OpenSceneGraph',
                'OpenSSL',
                'OpenThreads',
                'osg',
                'osg_functions',
                'osgAnimation',
                'osgDB',
                'osgFX',
                'osgGA',
                'osgIntrospection',
                'osgManipulator',
                'osgParticle',
                'osgPresentation',
                'osgProducer',
                'osgQt',
                'osgShadow',
                'osgSim',
                'osgTerrain',
                'osgText',
                'osgUtil',
                'osgViewer',
                'osgVolume',
                'osgWidget',
                'Patch',
                'Perl',
                'PerlLibs',
                'PHP4',
                'PhysFS',
                'Pike',
                'PkgConfig',
                'PNG',
                'PostgreSQL',
                'Producer',
                'Protobuf',
                'Python',
                'Python2',
                'Python3',
                'Qt3',
                'Qt4',
                'QuickTime',
                'RTI',
                'Ruby',
                'SDL',
                'SDL_image',
                'SDL_mixer',
                'SDL_net',
                'SDL_sound',
                'SDL_ttf',
                'SelfPackers',
                'Squish',
                'SQLite3',
                'Subversion',
                'SWIG',
                'TCL',
                'Tclsh',
                'TclStub',
                'Threads',
                'TIFF',
                'UnixCommands',
                'VTK',
                'Vulkan',
                'Wget',
                'Wish',
                'wxWidgets',
                'X11',
                'XalanC',
                'XCTest',
                'XercesC',
                'XMLRPC',
                'ZLIB',
            ];
            let packageName = await UserInterface.getFromList(packageList);
            if(packageName !== "")
            {
                if(packageName === "Custom Named")
                {
                    packageName = await UserInterface.prompt("Enter package name.");
                }
                
                //let packageMinVersion = await UserInterface.prompt("Minimum version of '"+packageName+"' (Leave blank for no minimum version)");
                FileSystemInterface.addLibrary(packageName);
                this.refresh();
            }
        }
    }

    async removeLibrary(node: TreeNode)
    {
        var library:string = node.name;
        if(library === "Standard C++ Library")
        {
            vscode.window.showInformationMessage("Standard C++ Library can not be removed.");
            return;
        }
        if(await UserInterface.yesNoCancelIsFalse(["Don't remove library '"+library+"'", "Remove library '"+library+"'"]))
        {
            FileSystemInterface.removeLibrary(library);
            this.refresh();
        }
    }

    async addBatchTest(node: TreeNode)
    {
        var batchName = await UserInterface.prompt("Batch Test Name");
        if(batchName !== "")
        {
            var projectName = node.relativeWorkspacePath;
            FileSystemInterface.addBatchTest(projectName, batchName);

            this.refresh();
        }
    }

    async addLicenseFull()
    {
        var projects = FileSystemInterface.getProjects();
        var projectName = await UserInterface.getFromList(projects);
        if(projectName !== "")
        {
            FileSystemInterface.createLicense(projectName);
            this.refresh();
        }
    }

    addLicense(node: TreeNode)
    {
        FileSystemInterface.createLicense(node.relativeWorkspacePath);
        this.refresh();
    }

    async createWorkspace()
    {
        var makeGit :boolean|undefined;
        var configure: boolean|undefined;
        if((makeGit = await UserInterface.yesNoCancel(["Don't Create git repo", "Create git repo"])) !== undefined)
        {
            if((configure = await UserInterface.yesNoCancel(["Don't initialize CMake (Pick this if using CMake-Tools)", "Initialize CMake (Pick this if you are manually running Ninja)"])) !== undefined)
            {
                FileSystemInterface.createWorkspace();
                if(makeGit)
                {
                    SystemCaller.initilizeGit(this.workspaceRoot);
                }
                if(configure)
                {
                    SystemCaller.runCMake(this.workspaceRoot);
                }
                this.refresh();
            }
        }
    }

    deleteBinaries()
    {
        FileSystemInterface.deleteBinaries();
        this.refresh();
    }

    removeCmakeData()
    {
        FileSystemInterface.removeCmakeData();
        this.refresh();
    }

    unloadProject(node: TreeNode)
    {
        FileSystemInterface.unloadProject(node.relativeWorkspacePath);
        this.refresh();
    }

    reloadProject(node: TreeNode)
    {
        FileSystemInterface.reloadProject(node.relativeWorkspacePath);
        this.refresh();
    }

    async createProject()
    {
        var projectName = await UserInterface.prompt('Enter Project Name');
        var projectType = await UserInterface.getProjectType();

        if(projectType !== TreeNodeType.file)
        {
            FileSystemInterface.createProject(projectName, projectType);
            this.refresh();
        }
    }

    async deleteProject(projectName: string|undefined)
    {
        if(projectName !== undefined)
        {
            if(await UserInterface.deleteProject(projectName))
            {
                FileSystemInterface.deleteFolderRecursive(this.workspaceRoot+"/"+projectName);
                this.refresh();
            }
        }
    }

    openClassFile(node: TreeNode, folderName: string, extension: string)
    {
        let fullPath = node.fullPath;
		let firstSectionBegin = fullPath.indexOf("{");
		let firstSectionEnd = fullPath.indexOf("}");
		let folderFixed = fullPath.substring(0, firstSectionBegin) + folderName + fullPath.substring(firstSectionEnd+1);

		firstSectionBegin = folderFixed.indexOf("{");
		let completeFix = folderFixed.substring(0, firstSectionBegin)+extension;
		vscode.window.showTextDocument(vscode.Uri.file(completeFix));
    }

    async deleteClass(node: TreeNode)
    {
        if(await UserInterface.deleteClass(node.name))
        {
            let relativeWorkspacePath = node.relativeWorkspacePath;
            let firstSectionBegin = relativeWorkspacePath.indexOf("{");
            let firstSectionEnd = relativeWorkspacePath.indexOf("}");
            
            let folderFixed = relativeWorkspacePath.substring(0, firstSectionBegin) + "src" + relativeWorkspacePath.substring(firstSectionEnd+1);
            firstSectionBegin = folderFixed.indexOf("{");
            let completeFix = folderFixed.substring(0, firstSectionBegin)+".cpp";
            FileSystemInterface.deleteFile(completeFix);
            
            folderFixed = relativeWorkspacePath.substring(0, firstSectionBegin) + "include" + relativeWorkspacePath.substring(firstSectionEnd+1);
            firstSectionBegin = folderFixed.indexOf("{");
            completeFix = folderFixed.substring(0, firstSectionBegin)+".hpp";
            FileSystemInterface.deleteFile(completeFix);
            this.refresh();
        }
    }

     async createClass(parent: TreeNode)
     {
        var fileType = await UserInterface.getFileType();
        var fileName = "";
        if(fileType === FileType.classType)
        {
            fileName = await UserInterface.prompt('Enter Class Name');
            if(fileName !== "")
            {
                fileName = fileName.replace(" ","");
                FileSystemInterface.createHeaderFile(parent.relativeWorkspacePath+"/include/"+fileName+".hpp", parent.name, fileName, true);
                FileSystemInterface.createImplementationFile(parent.relativeWorkspacePath+"/src/"+fileName+".cpp", parent.name, fileName);
            }
        }
        else if(fileType === FileType.template)
        {
            fileName = await UserInterface.prompt('Enter Class Template Name');
            if(fileName !== "")
            {
                fileName = fileName.replace(" ","");
                FileSystemInterface.createTemplateFile(parent.relativeWorkspacePath+"/include/"+fileName+".hpp", parent.name, fileName);
            }
        }
        else if(fileType === FileType.hpp)
        {
            fileName = await UserInterface.prompt('Enter .hpp file name');
            if(fileName !== "")
            {
                fileName = fileName.replace(" ","");
                FileSystemInterface.createHeaderFile(parent.relativeWorkspacePath+"/include/"+fileName+".hpp", parent.name, fileName, false);
            }
        }
        else if(fileType === FileType.cpp)
        {
            fileName = await UserInterface.prompt('Enter .cpp file name');
            if(fileName !== "")
            {
                fileName = fileName.replace(" ","");
                FileSystemInterface.createImplementationFile(parent.relativeWorkspacePath+"/src/"+fileName+".cpp", parent.name, "");
            }
        }
        else
        {
            return;
        }

        this.refresh();
     }

     async addNonCodeFile(parent: TreeNode)
     {
        var fileName = await UserInterface.prompt('Enter File Name With Extension');
        if(fileName !== "")
        {
            fileName = fileName.replace(" ","");
            FileSystemInterface.addFile(parent.relativeWorkspacePath+"/"+fileName);
            this.refresh();
        }
     }
}