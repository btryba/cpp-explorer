import * as child_process from 'child_process';
import * as os from 'os';

export class SystemCaller
{
    static initilizeGit(workspaceRoot :string)
    {
        var extension = "";
        if(os.platform() === "win32")
        {
            extension = ".exe";
        }
        child_process.exec("git"+extension+" -C \""+workspaceRoot+"\" init");
        child_process.exec("git"+extension+" -C \""+workspaceRoot+"\" submodule init");
    }

    runCMake()
    {
        //mkdir build
        //cd build
        //cmake .. -G Ninja
        //ninja -v
        ////check bin output
        //this.refresh();
        //run bin
    }
}