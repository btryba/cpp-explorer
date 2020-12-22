import * as vscode from 'vscode';
import {TreeNode, TreeNodeType} from './TreeNode';
import {UserInterface, FileType} from './UserInterface';
import {SystemCaller} from './SystemCaller';
import {TreeProvider} from './TreeProvider';

export class ExplorerTree extends TreeProvider
{
    constructor(workspaceRoot: any)
    {
        super(workspaceRoot);
        this.readWorkspace();
    }

    //Commands
    async deleteFile(relativeWorkspacePath: string)
    {
        if(relativeWorkspacePath !== undefined)
        {
            if(await UserInterface.removeFile())
            {
                this.fileSystemInterface.deleteFile(relativeWorkspacePath);
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
                this.fileSystemInterface.addProjectFolder(node.relativeWorkspacePath+"/include", folderName);
                this.fileSystemInterface.addProjectFolder(node.relativeWorkspacePath+"/src", folderName);
            }
            else //Folder
            {
                let relativeWorkspacePath = node.relativeWorkspacePath;
                let firstSectionBegin = relativeWorkspacePath.indexOf("{");
                let firstSectionEnd = relativeWorkspacePath.indexOf("}");
                let folderFixed = relativeWorkspacePath.substring(0, firstSectionBegin) + "include" + relativeWorkspacePath.substring(firstSectionEnd+1);
                this.fileSystemInterface.addProjectFolder(folderFixed, folderName);
                folderFixed = relativeWorkspacePath.substring(0, firstSectionBegin) + "src" + relativeWorkspacePath.substring(firstSectionEnd+1);
                this.fileSystemInterface.addProjectFolder(folderFixed, folderName);
            }
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
                //let packageMinVersion = await UserInterface.prompt("Minimum version of '"+packageName+"' (Leave blank for no minimum version)");
                this.fileSystemInterface.addLibrary(packageName);
                this.refresh();
            }
        }
    }

    async removeLibrary(node: TreeNode)
    {
        if(node.label !== undefined)
        {
            var library:string = node.label.toString();
            if(library === "Standard C++ Library")
            {
                vscode.window.showInformationMessage("Standard C++ Library can not be removed.");
                return;
            }
            if(await UserInterface.yesNoCancelIsFalse(["Don't remove library '"+library+"'", "Remove library '"+library+"'"]))
            {
                this.fileSystemInterface.removeLibrary(library);
                this.refresh();
            }
        }
    }

    async addBatchTest(node: TreeNode)
    {
        var batchName = await UserInterface.prompt("Batch Test Name");
        if(batchName !== "")
        {
            var projectName = node.relativeWorkspacePath;
            this.fileSystemInterface.addBatchTest(projectName, batchName);

            this.refresh();
        }
    }

    async addLicenseFull()
    {
        var projects = this.fileSystemInterface.getProjects();
        var projectName = await UserInterface.getFromList(projects);
        if(projectName !== "")
        {
            this.fileSystemInterface.createLicense(projectName);
            this.refresh();
        }
    }

    addLicense(node: TreeNode)
    {
        this.fileSystemInterface.createLicense(node.relativeWorkspacePath);
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
                this.fileSystemInterface.createWorkspace();
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
        this.fileSystemInterface.deleteBinaries();
        this.refresh();
    }

    removeCmakeData()
    {
        this.fileSystemInterface.removeCmakeData();
        this.refresh();
    }

    unloadProject(node: TreeNode)
    {
        this.fileSystemInterface.unloadProject(node.relativeWorkspacePath);
        this.refresh();
    }

    reloadProject(node: TreeNode)
    {
        this.fileSystemInterface.reloadProject(node.relativeWorkspacePath);
        this.refresh();
    }

    async createProject()
    {
        var projectName = await UserInterface.prompt('Enter Project Name');
        var projectType = await UserInterface.getProjectType();

        if(projectType !== TreeNodeType.file)
        {
            this.fileSystemInterface.createProject(projectName, projectType);
            this.refresh();
        }
    }

    async deleteProject(projectName: string|undefined)
    {
        if(projectName !== undefined)
        {
            if(await UserInterface.deleteProject(projectName))
            {
                this.fileSystemInterface.deleteFolderRecursive(this.workspaceRoot+"/"+projectName);
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
        if(node.label !== undefined)
        {
            if(await UserInterface.deleteClass(node.label?.toString()))
            {
                let relativeWorkspacePath = node.relativeWorkspacePath;
                let firstSectionBegin = relativeWorkspacePath.indexOf("{");
                let firstSectionEnd = relativeWorkspacePath.indexOf("}");
                
                let folderFixed = relativeWorkspacePath.substring(0, firstSectionBegin) + "src" + relativeWorkspacePath.substring(firstSectionEnd+1);
                firstSectionBegin = folderFixed.indexOf("{");
                let completeFix = folderFixed.substring(0, firstSectionBegin)+".cpp";
                this.fileSystemInterface.deleteFile(completeFix);
                
                folderFixed = relativeWorkspacePath.substring(0, firstSectionBegin) + "include" + relativeWorkspacePath.substring(firstSectionEnd+1);
                firstSectionBegin = folderFixed.indexOf("{");
                completeFix = folderFixed.substring(0, firstSectionBegin)+".hpp";
                this.fileSystemInterface.deleteFile(completeFix);
                this.refresh();
            }
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
                this.fileSystemInterface.createHeaderFile(parent.relativeWorkspacePath+"/include/"+fileName+".hpp", parent.name, fileName, true);
                this.fileSystemInterface.createImplementationFile(parent.relativeWorkspacePath+"/src/"+fileName+".cpp", parent.name, fileName);
            }
        }
        else if(fileType === FileType.template)
        {
            fileName = await UserInterface.prompt('Enter Class Template Name');
            if(fileName !== "")
            {
                fileName = fileName.replace(" ","");
                this.fileSystemInterface.createTemplateFile(parent.relativeWorkspacePath+"/include/"+fileName+".hpp", parent.name, fileName);
            }
        }
        else if(fileType === FileType.hpp)
        {
            fileName = await UserInterface.prompt('Enter .hpp file name');
            if(fileName !== "")
            {
                fileName = fileName.replace(" ","");
                this.fileSystemInterface.createHeaderFile(parent.relativeWorkspacePath+"/include/"+fileName+".hpp", parent.name, fileName, false);
            }
        }
        else if(fileType === FileType.cpp)
        {
            fileName = await UserInterface.prompt('Enter .cpp file name');
            if(fileName !== "")
            {
                fileName = fileName.replace(" ","");
                this.fileSystemInterface.createImplementationFile(parent.relativeWorkspacePath+"/src/"+fileName+".cpp", parent.name, "");
            }
        }
        else
        {
            return;
        }

        this.refresh();
     }
}